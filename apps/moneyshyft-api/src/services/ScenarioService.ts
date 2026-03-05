import knex from '../config/knex';
import { NotFoundError } from '../middleware/errorHandler';
import { BudgetService } from './BudgetService';
import { v4 as uuidv4 } from 'uuid';

export interface Scenario {
    id: string;
    household_id: string;
    name: string;
    description: string | null;
    created_at: Date;
    updated_at: Date;
    items?: ScenarioItem[];
}

export interface ScenarioItem {
    id: string;
    scenario_id: string;
    type: 'income_adjustment' | 'expense_adjustment' | 'one_time_expense' | 'one_time_income';
    scope: 'global' | 'category' | 'section';
    category_id?: string | null;
    section_id?: string | null;
    amount: number;
    is_percentage: boolean;
    created_at: Date;
    updated_at: Date;
}

export interface CreateScenarioDTO {
    name: string;
    description?: string;
}

export interface AddScenarioItemDTO {
    type: ScenarioItem['type'];
    scope: ScenarioItem['scope'];
    category_id?: string;
    section_id?: string;
    amount: number;
    is_percentage: boolean;
}

// Projection types extending BudgetSummary
export interface ScenarioProjection {
    baseline: any; // The original BudgetSummary
    projected: any; // The modified BudgetSummary
    scenario: Scenario;
}

export class ScenarioService {
    /**
     * List scenarios for a household
     */
    static async getScenarios(householdId: string): Promise<Scenario[]> {
        return knex('scenarios')
            .where({ household_id: householdId })
            .orderBy('created_at', 'desc');
    }

    /**
     * Get single scenario with items
     */
    static async getScenarioById(id: string, householdId: string): Promise<Scenario> {
        const scenario = await knex('scenarios')
            .where({ id, household_id: householdId })
            .first();

        if (!scenario) throw new NotFoundError('Scenario not found');

        const items = await knex('scenario_items')
            .where({ scenario_id: id });

        return { ...scenario, items };
    }

    /**
     * Create new scenario
     */
    static async createScenario(householdId: string, data: CreateScenarioDTO): Promise<Scenario> {
        const [scenario] = await knex('scenarios')
            .insert({
                household_id: householdId,
                name: data.name,
                description: data.description || null
            })
            .returning('*');
        return scenario;
    }

    /**
     * Update scenario metadata
     */
    static async updateScenario(id: string, householdId: string, data: Partial<CreateScenarioDTO>): Promise<Scenario> {
        const [updated] = await knex('scenarios')
            .where({ id, household_id: householdId })
            .update({
                ...data,
                updated_at: knex.fn.now()
            })
            .returning('*');

        if (!updated) throw new NotFoundError('Scenario not found');
        return updated;
    }

    /**
     * Delete scenario
     */
    static async deleteScenario(id: string, householdId: string): Promise<void> {
        const deleted = await knex('scenarios')
            .where({ id, household_id: householdId })
            .delete();

        if (!deleted) throw new NotFoundError('Scenario not found');
    }

    /**
     * Add Item to Scenario
     */
    static async addItem(scenarioId: string, householdId: string, data: AddScenarioItemDTO): Promise<ScenarioItem> {
        // Verify ownership
        const scenario = await knex('scenarios').where({ id: scenarioId, household_id: householdId }).first();
        if (!scenario) throw new NotFoundError('Scenario not found');

        const [item] = await knex('scenario_items')
            .insert({
                scenario_id: scenarioId,
                type: data.type,
                scope: data.scope,
                category_id: data.category_id || null,
                section_id: data.section_id || null,
                amount: data.amount,
                is_percentage: data.is_percentage
            })
            .returning('*');

        return {
            ...item,
            amount: Number(item.amount)
        };
    }

    /**
     * Remove Item
     */
    static async removeItem(itemId: string, householdId: string): Promise<void> {
        // Verify item belongs to a scenario owned by household
        const item = await knex('scenario_items')
            .join('scenarios', 'scenario_items.scenario_id', 'scenarios.id')
            .where({ 'scenario_items.id': itemId, 'scenarios.household_id': householdId })
            .select('scenario_items.id')
            .first();

        if (!item) throw new NotFoundError('Item not found');

        await knex('scenario_items').where({ id: itemId }).delete();
    }

    /**
     * Generate Projection
     * Applies scenario items to the current month's budget to create a 'Shadow Budget'
     */
    static async generateProjection(scenarioId: string, householdId: string): Promise<ScenarioProjection> {
        const scenario = await this.getScenarioById(scenarioId, householdId);

        // 1. Get Baseline (Current Month Budget)
        const currentMonth = new Date();
        // Normalize to 1st of month
        const monthDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);

        // We get the full budget summary which includes income, allocations, spending, etc.
        const baseline = await BudgetService.getBudgetSummary(householdId, monthDate);

        // 2. Clone Baseline to create Projected
        const projected = JSON.parse(JSON.stringify(baseline)); // Deep copy

        // 3. Apply Items
        if (scenario.items) {
            for (const item of scenario.items) {
                this.applyItemToProjection(projected, item);
            }
        }

        // 4. Re-calculate totals after adjustments
        // Since we modifying components, we need to update the aggregates
        this.recalculateTotals(projected);

        return {
            baseline,
            projected,
            scenario
        };
    }

    /**
     * Apply a single adjustment item to the projection
     */
    private static applyItemToProjection(projection: any, item: ScenarioItem) {
        const amount = Number(item.amount);

        if (item.type === 'income_adjustment') {
            // Modify Planned Income
            if (item.scope === 'global') {
                if (item.is_percentage) {
                    projection.total_planned_income = projection.total_planned_income * (1 + (amount / 100));
                } else {
                    projection.total_planned_income += amount;
                }
            }
            // Note: We don't support scoped income adjustments well yet as income sources aren't in summary detail
            // So we assume global mostly.
        }

        else if (item.type === 'expense_adjustment') {
            // Modify Allocations (Planned Expenses)
            // Iterate through sections/categories

            const applyChange = (currentVal: number): number => {
                if (item.is_percentage) {
                    return currentVal * (1 + (amount / 100));
                } else {
                    return currentVal + amount;
                }
            };

            if (item.scope === 'global') {
                // Apply to ALL categories/sections allocated amounts
                projection.sections.forEach((section: any) => {
                    if (section.rollup_mode) {
                        section.allocated = applyChange(section.allocated);
                    } else {
                        section.categories.forEach((cat: any) => {
                            cat.allocated = applyChange(cat.allocated);
                        });
                    }
                });
            }
            else if (item.scope === 'section' && item.section_id) {
                const section = projection.sections.find((s: any) => s.section_id === item.section_id);
                if (section) {
                    if (section.rollup_mode) {
                        section.allocated = applyChange(section.allocated);
                    } else {
                        // Distribute across categories? Or just apply to all categories in section?
                        // Simple model: Apply to all categories in section
                        section.categories.forEach((cat: any) => {
                            cat.allocated = applyChange(cat.allocated);
                        });
                    }
                }
            }
            else if (item.scope === 'category' && item.category_id) {
                // Find category
                for (const section of projection.sections) {
                    if (section.rollup_mode) continue;
                    const cat = section.categories.find((c: any) => c.category_id === item.category_id);
                    if (cat) {
                        cat.allocated = applyChange(cat.allocated);
                        break;
                    }
                }
            }
        }

        else if (item.type === 'one_time_expense') {
            // Just adds to the total allocated (maybe as a generic item or just increasing global totals?)
            // For visibility, we can't easily add a row to 'sections'.
            // But we can affect the `total_allocated` and `total_remaining`.
            // Let's add it to a "Scenario Adjustments" section? Or just mutate totals?
            // Mutating totals is safer for simple projection.
            // However, recalculateTotals() sums up sections. So we need to modify sections.
            // Strategy: Add to 'uncategorized' or spread? 
            // Better: Just modify the `total_allocated` AFTER the sum loop? 
            // But RecalculateTotals overwrites it. 
            // Let's modify the `income_variance` or `to_be_assigned` directly for one-offs?

            // Actually, expense adjustment increases Needed money.
            // Let's treat it as a reduction in `to_be_assigned`.
            projection.to_be_assigned -= amount;
        }

        else if (item.type === 'one_time_income') {
            projection.total_planned_income += amount;
        }
    }

    /**
     * Recalculate summary totals based on modified section/category data
     */
    private static recalculateTotals(projection: any) {
        let newTotalAllocated = 0;

        projection.sections.forEach((section: any) => {
            if (section.section_type === 'income') return;

            if (!section.rollup_mode) {
                // Sum categories
                let secAlloc = 0;
                section.categories.forEach((cat: any) => {
                    // Recalculate derived fields
                    cat.remaining = cat.allocated - cat.spent;
                    cat.need = Math.max(0, cat.allocated - cat.assigned);
                    secAlloc += cat.allocated;
                });
                section.allocated = secAlloc;
            }

            // Recalculate section derived
            section.remaining = section.allocated - section.spent;
            section.need = Math.max(0, section.allocated - section.assigned);

            newTotalAllocated += section.allocated;
        });

        projection.total_allocated = newTotalAllocated;

        // Recalculate Top Level
        projection.total_remaining = projection.total_allocated - projection.total_spent;

        // To Be Assigned = (Real Income + Balances) - Assigned
        // We project based on PLANNED income for future scenarios mostly?
        // User wants "What if income drops?".
        // If we use Real Income, that's already happened. 
        // For scenarios, we should probably look at PLANNED income vs PLANNED expenses (Allocated).
        // Let's calculate a "Projected Net" = Total Planned Income - Total Allocated

        projection.projected_net = projection.total_planned_income - projection.total_allocated;
    }
}
