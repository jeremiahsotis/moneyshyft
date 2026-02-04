
// Mocking necessary parts to replicate AssignmentService.assignToCategories logic failure

interface Transaction {
  id: string;
  amount: number;
  date: string;
}

interface AssignedAmount {
  transactionId: string;
  amount: number;
}

// Mock Database State
const transactions: Transaction[] = []; // No income transactions
const assignments: AssignedAmount[] = []; 
const accountBalances = 6000; // $6000 Opening Balance
const incomeTransactionsTotal = 0; 
const totalAssigned = 0;

// Calculated Available Funds (Logic from BudgetService.getToBeAssigned)
const toBeAssigned = (incomeTransactionsTotal + accountBalances) - totalAssigned;

// Expected behavior: available = $6000
console.log(`To Be Assigned (Real): ${toBeAssigned}`);

// Logic from AssignmentService.buildTransactionPool (Simplified)
// It only fetches INCOME transactions
const pool = transactions.map(t => {
   const assigned = assignments.filter(a => a.transactionId === t.id).reduce((sum, a) => sum + a.amount, 0);
   return {
     ...t,
     available: t.amount - assigned
   };
});

const totalAvailableInPool = pool.reduce((sum, t) => sum + t.available, 0);

console.log(`Total Available in Transaction Pool: ${totalAvailableInPool}`);

const requestedAmount = 500; // User tries to assign $500

if (requestedAmount > totalAvailableInPool) {
  console.log(`[FAIL] Insufficient funds: $${requestedAmount} requested, $${totalAvailableInPool} available`);
  console.log(`But user actually has $${toBeAssigned} ready to assign!`);
} else {
  console.log(`[SUCCESS] Assignment proceedure started.`);
}
