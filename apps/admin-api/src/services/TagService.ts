import knex from '../config/knex';
import { BadRequestError, NotFoundError } from '../middleware/errorHandler';
import logger from '../utils/logger';

export interface Tag {
  id: string;
  household_id: string;
  name: string;
  parent_tag_id: string | null;
  sort_order: number;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

interface CreateTagData {
  name: string;
  parent_tag_id?: string | null;
  color?: string | null;
  icon?: string | null;
}

interface UpdateTagData {
  name?: string;
  parent_tag_id?: string | null;
  color?: string | null;
  icon?: string | null;
  is_active?: boolean;
}

export class TagService {
  static async getAllTags(householdId: string): Promise<Tag[]> {
    return knex('tags')
      .where({ household_id: householdId })
      .orderBy([
        { column: 'parent_tag_id', order: 'asc' },
        { column: 'sort_order', order: 'asc' },
        { column: 'name', order: 'asc' }
      ]);
  }

  static async getTagById(tagId: string, householdId: string): Promise<Tag> {
    const tag = await knex('tags')
      .where({ id: tagId, household_id: householdId })
      .first();

    if (!tag) {
      throw new NotFoundError('Tag not found');
    }

    return tag;
  }

  static async createTag(householdId: string, data: CreateTagData): Promise<Tag> {
    const { name, parent_tag_id, color, icon } = data;

    let parentTagId: string | null = parent_tag_id || null;

    if (parentTagId) {
      const parent = await this.getTagById(parentTagId, householdId);
      if (parent.parent_tag_id) {
        throw new BadRequestError('Tags can only be nested one level deep');
      }
    }

    const sortOrderResult = await knex('tags')
      .where({ household_id: householdId, parent_tag_id: parentTagId })
      .max('sort_order as max')
      .first();

    const nextSortOrder = Number(sortOrderResult?.max || 0) + 1;

    const [tag] = await knex('tags')
      .insert({
        household_id: householdId,
        name,
        parent_tag_id: parentTagId,
        color: color || null,
        icon: icon || null,
        sort_order: nextSortOrder,
        is_active: true
      })
      .returning('*');

    logger.info(`Tag created: ${tag.id} for household: ${householdId}`);

    return tag;
  }

  static async updateTag(tagId: string, householdId: string, data: UpdateTagData): Promise<Tag> {
    const tag = await this.getTagById(tagId, householdId);

    if (data.parent_tag_id !== undefined) {
      if (data.parent_tag_id === tagId) {
        throw new BadRequestError('Tag cannot be its own parent');
      }

      const children = await knex('tags')
        .where({ household_id: householdId, parent_tag_id: tagId })
        .count('* as count')
        .first();

      const hasChildren = Number(children?.count || 0) > 0;

      if (data.parent_tag_id && hasChildren) {
        throw new BadRequestError('Parent tags cannot be nested under another parent');
      }

      if (data.parent_tag_id) {
        const parent = await this.getTagById(data.parent_tag_id, householdId);
        if (parent.parent_tag_id) {
          throw new BadRequestError('Tags can only be nested one level deep');
        }
      }
    }

    const [updated] = await knex('tags')
      .where({ id: tagId, household_id: householdId })
      .update({
        ...data,
        updated_at: knex.fn.now()
      })
      .returning('*');

    return updated;
  }

  static async deleteTag(tagId: string, householdId: string): Promise<void> {
    await this.getTagById(tagId, householdId);

    await knex('tags')
      .where({ id: tagId, household_id: householdId })
      .del();
  }
}
