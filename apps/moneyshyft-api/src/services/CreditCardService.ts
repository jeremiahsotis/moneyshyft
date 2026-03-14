import knex from '../config/knex';
import { NotFoundError } from '../middleware/errorHandler';
import { AccountService } from './AccountService';
import logger from '../utils/logger';

interface CreditCardStatus {
  account_id: string;
  account_name: string;
  previous_balance: number;
  new_charges_this_month: number;
  total_owed: number;
  payments_this_month: number;
  new_charges_covered_by_budget: number;
  is_current: boolean;
  month_start_date: Date;
  warning_message: string | null;
  success_message: string | null;
}

export class CreditCardService {
  /**
   * Get detailed credit card status with trauma-informed messaging
   */
  static async getCreditCardStatus(
    accountId: string,
    householdId: string
  ): Promise<CreditCardStatus> {
    // Get account and verify it's a credit card
    const account = await AccountService.getAccountById(accountId, householdId);

    if (account.type !== 'credit') {
      throw new NotFoundError('Account is not a credit card');
    }

    // Get month start date (default to current month if not set)
    const monthStartDate = account.month_start_date
      ? new Date(account.month_start_date)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

    // Calculate values
    const previousBalance = Number(account.previous_balance_at_start || 0);
    const currentBalance = Math.abs(Number(account.current_balance));
    const newChargesThisMonth = Math.max(0, currentBalance - previousBalance);
    const totalOwed = currentBalance;

    // Calculate payments this month
    const paymentsResult = await knex('transactions')
      .where({
        account_id: accountId,
        household_id: householdId
      })
      .where('transaction_date', '>=', monthStartDate)
      .where('amount', '>', 0) // Positive amounts are payments/credits
      .sum('amount as total')
      .first();

    const paymentsThisMonth = Number(paymentsResult?.total || 0);

    // New charges are "covered" by the budget because spending on credit
    // reduces category budgets immediately
    const newChargesCoveredByBudget = newChargesThisMonth;

    // Determine if user is "current" (no previous balance)
    const isCurrent = previousBalance === 0;

    // Generate trauma-informed messages
    const { warningMessage, successMessage } = this.generateMessages({
      previousBalance,
      newChargesThisMonth,
      paymentsThisMonth,
      totalOwed,
      isCurrent
    });

    return {
      account_id: accountId,
      account_name: account.name,
      previous_balance: previousBalance,
      new_charges_this_month: newChargesThisMonth,
      total_owed: totalOwed,
      payments_this_month: paymentsThisMonth,
      new_charges_covered_by_budget: newChargesCoveredByBudget,
      is_current: isCurrent,
      month_start_date: monthStartDate,
      warning_message: warningMessage,
      success_message: successMessage
    };
  }

  /**
   * Rollover credit card to new month (updates tracking fields)
   * This should be called automatically on the 1st of each month
   */
  static async rolloverToNewMonth(
    accountId: string,
    householdId: string,
    newMonthDate: Date
  ): Promise<void> {
    const account = await AccountService.getAccountById(accountId, householdId);

    if (account.type !== 'credit') {
      throw new NotFoundError('Account is not a credit card');
    }

    // Set previous balance to current balance
    // This "freezes" the current debt as "previous balance"
    await knex('accounts')
      .where({ id: accountId })
      .update({
        previous_balance_at_start: Math.abs(Number(account.current_balance)),
        month_start_date: newMonthDate,
        updated_at: knex.fn.now()
      });

    logger.info(`Credit card ${accountId} rolled over to new month: ${newMonthDate.toISOString()}`);
  }

  /**
   * Generate trauma-informed messages based on credit card status
   */
  private static generateMessages(data: {
    previousBalance: number;
    newChargesThisMonth: number;
    paymentsThisMonth: number;
    totalOwed: number;
    isCurrent: boolean;
  }): { warningMessage: string | null; successMessage: string | null } {
    const { previousBalance, newChargesThisMonth, paymentsThisMonth, totalOwed, isCurrent } = data;

    let warningMessage: string | null = null;
    let successMessage: string | null = null;

    // Fully paid off
    if (totalOwed === 0) {
      successMessage = "🎉 Fully paid! Your credit card has a zero balance.";
      return { warningMessage, successMessage };
    }

    // User is current (no previous balance) with new charges
    if (isCurrent && newChargesThisMonth > 0) {
      successMessage = `✅ You're current on this card! You have $${newChargesThisMonth.toFixed(2)} in new charges from this month's budget.`;
      warningMessage = `💡 Pay $${newChargesThisMonth.toFixed(2)} by the end of the month to stay debt-free.`;
      return { warningMessage, successMessage };
    }

    // User is current with no new charges
    if (isCurrent && newChargesThisMonth === 0) {
      successMessage = "✅ You're current on this card with no new charges this month.";
      return { warningMessage, successMessage };
    }

    // User has previous balance and made payments
    if (previousBalance > 0 && paymentsThisMonth > 0) {
      const previousBalanceRemaining = Math.max(0, previousBalance - paymentsThisMonth);

      if (previousBalanceRemaining === 0) {
        // Paid off previous balance!
        successMessage = `Great progress! Your previous balance is paid off. You now have $${newChargesThisMonth.toFixed(2)} in new charges from this month.`;

        if (newChargesThisMonth > 0) {
          warningMessage = `Pay $${newChargesThisMonth.toFixed(2)} to stay on track and avoid carrying a balance.`;
        }
      } else {
        // Still has previous balance
        const paymentCoverage = paymentsThisMonth >= newChargesThisMonth;

        if (paymentCoverage) {
          successMessage = `You paid $${paymentsThisMonth.toFixed(2)} this month, which covered your new charges and reduced your previous balance.`;
        } else {
          warningMessage = `Your payment of $${paymentsThisMonth.toFixed(2)} was applied to your previous balance. You still have $${newChargesThisMonth.toFixed(2)} in new charges from this month's budget.`;
        }

        if (previousBalanceRemaining > 0) {
          warningMessage = (warningMessage || "") + ` ${previousBalanceRemaining > 0 ? `Previous balance remaining: $${previousBalanceRemaining.toFixed(2)}.` : ""}`;
        }
      }

      return { warningMessage, successMessage };
    }

    // User has previous balance but no payments yet
    if (previousBalance > 0 && paymentsThisMonth === 0) {
      warningMessage = `You have $${previousBalance.toFixed(2)} in previous balance and $${newChargesThisMonth.toFixed(2)} in new charges this month. Consider making a payment to avoid growing your balance.`;
      return { warningMessage, successMessage };
    }

    // Default fallback
    warningMessage = `Current balance: $${totalOwed.toFixed(2)}`;
    return { warningMessage, successMessage };
  }

  /**
   * Get all credit card accounts for a household with their statuses
   */
  static async getAllCreditCardStatuses(householdId: string): Promise<CreditCardStatus[]> {
    const accounts = await knex('accounts')
      .where({ household_id: householdId, type: 'credit', is_active: true });

    const statuses = await Promise.all(
      accounts.map(account => this.getCreditCardStatus(account.id, householdId))
    );

    return statuses;
  }
}
