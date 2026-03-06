import knex from '../config/knex';
import { NotFoundError, BadRequestError } from '../middleware/errorHandler';
import logger from '../utils/logger';

interface CategorySection {
  id: string;
  household_id: string;
  name: string;
  type: 'fixed' | 'flexible' | 'debt';
  sort_order: number;
  is_system: boolean;
  created_at: Date;
  updated_at: Date;
}

interface Category {
  id: string;
  household_id: string;
  section_id: string;
  name: string;
  parent_category_id: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_system: boolean;
  is_archived: boolean;
  created_at: Date;
  updated_at: Date;
}

export class CategoryService {
  // ===========================
  // SECTIONS
  // ===========================

  /**
   * Get all sections for a household
   */
  static async getAllSections(householdId: string): Promise<CategorySection[]> {
    const sections = await knex('category_sections')
      .where({ household_id: householdId })
      .orderBy('sort_order', 'asc');

    return sections;
  }

  /**
   * Get a single section by ID
   */
  static async getSectionById(sectionId: string, householdId: string): Promise<CategorySection> {
    const section = await knex('category_sections')
      .where({ id: sectionId, household_id: householdId })
      .first();

    if (!section) {
      throw new NotFoundError('Section not found');
    }

    return section;
  }

  /**
   * Create a new section
   */
  static async createSection(
    householdId: string,
    data: { name: string; type: 'fixed' | 'flexible' | 'debt'; sort_order?: number }
  ): Promise<CategorySection> {
    const { name, type, sort_order = 0 } = data;

    const [section] = await knex('category_sections')
      .insert({
        household_id: householdId,
        name,
        type,
        sort_order,
        is_system: false
      })
      .returning('*');

    logger.info(`Section created: ${section.id} for household: ${householdId}`);

    return section;
  }

  /**
   * Update a section
   */
  static async updateSection(
    sectionId: string,
    householdId: string,
    data: { name?: string; type?: 'fixed' | 'flexible' | 'debt'; sort_order?: number }
  ): Promise<CategorySection> {
    // Check if section exists and is not a system section
    const section = await this.getSectionById(sectionId, householdId);

    if (section.is_system) {
      throw new BadRequestError('System sections cannot be modified');
    }

    const [updatedSection] = await knex('category_sections')
      .where({ id: sectionId, household_id: householdId })
      .update({
        ...data,
        updated_at: knex.fn.now()
      })
      .returning('*');

    logger.info(`Section updated: ${sectionId}`);

    return updatedSection;
  }

  /**
   * Delete a section
   */
  static async deleteSection(sectionId: string, householdId: string): Promise<void> {
    const section = await this.getSectionById(sectionId, householdId);

    if (section.is_system) {
      throw new BadRequestError('System sections cannot be deleted');
    }

    // Check if section has categories
    const categoryCount = await knex('categories')
      .where({ section_id: sectionId })
      .count('id as count')
      .first();

    if (categoryCount && Number(categoryCount.count) > 0) {
      throw new BadRequestError('Cannot delete section with existing categories');
    }

    await knex('category_sections')
      .where({ id: sectionId, household_id: householdId })
      .del();

    logger.info(`Section deleted: ${sectionId}`);
  }

  // ===========================
  // CATEGORIES
  // ===========================

  /**
   * Get all categories for a household (organized by section)
   */
  static async getAllCategories(householdId: string): Promise<any> {
    const sections = await this.getAllSections(householdId);

    const categories = await knex('categories')
      .where({ household_id: householdId })
      .orderBy('sort_order', 'asc');

    // Organize categories by section
    const result = sections.map(section => ({
      ...section,
      categories: categories.filter(cat => cat.section_id === section.id)
    }));

    return result;
  }

  /**
   * Get a single category by ID
   */
  static async getCategoryById(categoryId: string, householdId: string): Promise<Category> {
    const category = await knex('categories')
      .where({ id: categoryId, household_id: householdId })
      .first();

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return category;
  }

  /**
   * Create a new category
   */
  static async createCategory(
    householdId: string,
    data: {
      section_id: string;
      name: string;
      parent_category_id?: string | null;
      color?: string | null;
      icon?: string | null;
      sort_order?: number;
    }
  ): Promise<Category> {
    const { section_id, name, parent_category_id, color, icon, sort_order = 0 } = data;

    // Verify section belongs to household
    await this.getSectionById(section_id, householdId);

    // If parent category provided, verify it belongs to same section
    if (parent_category_id) {
      const parentCategory = await this.getCategoryById(parent_category_id, householdId);
      if (parentCategory.section_id !== section_id) {
        throw new BadRequestError('Parent category must belong to the same section');
      }
    }

    const [category] = await knex('categories')
      .insert({
        household_id: householdId,
        section_id,
        name,
        parent_category_id: parent_category_id || null,
        color: color || null,
        icon: icon || null,
        sort_order,
        is_system: false,
        is_archived: false
      })
      .returning('*');

    logger.info(`Category created: ${category.id} in section: ${section_id}`);

    return category;
  }

  /**
   * Update a category
   */
  static async updateCategory(
    categoryId: string,
    householdId: string,
    data: {
      name?: string;
      parent_category_id?: string | null;
      color?: string | null;
      icon?: string | null;
      sort_order?: number;
      is_archived?: boolean;
    }
  ): Promise<Category> {
    const category = await this.getCategoryById(categoryId, householdId);

    if (category.is_system) {
      throw new BadRequestError('System categories cannot be modified');
    }

    if (data.is_archived === true && category.is_system) {
      throw new BadRequestError('System categories cannot be archived');
    }

    // If updating parent, verify it belongs to same section
    if (data.parent_category_id !== undefined && data.parent_category_id !== null) {
      const parentCategory = await this.getCategoryById(data.parent_category_id, householdId);
      if (parentCategory.section_id !== category.section_id) {
        throw new BadRequestError('Parent category must belong to the same section');
      }
      // Prevent circular references
      if (data.parent_category_id === categoryId) {
        throw new BadRequestError('Category cannot be its own parent');
      }
    }

    const [updatedCategory] = await knex('categories')
      .where({ id: categoryId, household_id: householdId })
      .update({
        ...data,
        updated_at: knex.fn.now()
      })
      .returning('*');

    logger.info(`Category updated: ${categoryId}`);

    return updatedCategory;
  }

  /**
   * Delete a category
   */
  static async deleteCategory(categoryId: string, householdId: string): Promise<void> {
    const category = await this.getCategoryById(categoryId, householdId);

    if (category.is_system) {
      throw new BadRequestError('System categories cannot be deleted');
    }

    // Check if category has transactions
    const transactionCount = await knex('transactions')
      .where({ category_id: categoryId })
      .count('id as count')
      .first();

    if (transactionCount && Number(transactionCount.count) > 0) {
      throw new BadRequestError('Cannot delete category with existing transactions. Set category to null on transactions first.');
    }

    const allocationCount = await knex('budget_allocations')
      .where({ category_id: categoryId })
      .count('id as count')
      .first();

    if (allocationCount && Number(allocationCount.count) > 0) {
      throw new BadRequestError('Cannot delete category with existing budget allocations.');
    }

    const assignmentCount = await knex('income_assignments')
      .where({ category_id: categoryId })
      .count('id as count')
      .first();

    if (assignmentCount && Number(assignmentCount.count) > 0) {
      throw new BadRequestError('Cannot delete category with existing income assignments.');
    }

    const balanceAssignmentCount = await knex('account_balance_assignments')
      .where({ category_id: categoryId })
      .count('id as count')
      .first();

    if (balanceAssignmentCount && Number(balanceAssignmentCount.count) > 0) {
      throw new BadRequestError('Cannot delete category with existing balance assignments.');
    }

    const recurringCount = await knex('recurring_transactions')
      .where({ category_id: categoryId })
      .count('id as count')
      .first();

    if (recurringCount && Number(recurringCount.count) > 0) {
      throw new BadRequestError('Cannot delete category with existing recurring transactions.');
    }

    const recurringInstanceCount = await knex('recurring_transaction_instances')
      .where({ category_id: categoryId })
      .count('id as count')
      .first();

    if (recurringInstanceCount && Number(recurringInstanceCount.count) > 0) {
      throw new BadRequestError('Cannot delete category with existing recurring instances.');
    }

    const goalCount = await knex('goals')
      .where({ category_id: categoryId })
      .count('id as count')
      .first();

    if (goalCount && Number(goalCount.count) > 0) {
      throw new BadRequestError('Cannot delete category with existing goals.');
    }

    const debtCount = await knex('debts')
      .where({ category_id: categoryId })
      .count('id as count')
      .first();

    if (debtCount && Number(debtCount.count) > 0) {
      throw new BadRequestError('Cannot delete category with existing debts.');
    }

    const extraMoneyCount = await knex('extra_money_assignments')
      .where({ category_id: categoryId })
      .count('id as count')
      .first();

    if (extraMoneyCount && Number(extraMoneyCount.count) > 0) {
      throw new BadRequestError('Cannot delete category with existing extra money assignments.');
    }

    const scenarioCount = await knex('scenario_items')
      .where({ category_id: categoryId })
      .count('id as count')
      .first();

    if (scenarioCount && Number(scenarioCount.count) > 0) {
      throw new BadRequestError('Cannot delete category with existing scenario items.');
    }

    // Check if category has child categories
    const childCount = await knex('categories')
      .where({ parent_category_id: categoryId })
      .count('id as count')
      .first();

    if (childCount && Number(childCount.count) > 0) {
      throw new BadRequestError('Cannot delete category with child categories');
    }

    await knex('categories')
      .where({ id: categoryId, household_id: householdId })
      .del();

    logger.info(`Category deleted: ${categoryId}`);
  }
}
