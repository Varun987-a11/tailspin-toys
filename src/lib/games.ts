import { and, asc, eq, inArray } from 'drizzle-orm';
import type { Database } from './db';
import { games, categories, publishers } from '../../db/schema';
import type { Category, Game, Publisher } from '../types/game';

/** Optional category and publisher constraints for game listings. */
export interface GameFilters {
    /** Category ids to include; games matching any selected category are returned. */
    categoryIds?: number[];
    /** Publisher id to include. */
    publisherId?: number;
}

const gameSelection = {
    id: games.id,
    title: games.title,
    description: games.description,
    starRating: games.starRating,
    categoryId: categories.id,
    categoryName: categories.name,
    publisherId: publishers.id,
    publisherName: publishers.name,
};

type GameSelectionRow = {
    id: number;
    title: string;
    description: string;
    starRating: number | null;
    categoryId: number | null;
    categoryName: string | null;
    publisherId: number | null;
    publisherName: string | null;
};

function mapGame(row: GameSelectionRow): Game {
    return {
        id: row.id,
        title: row.title,
        description: row.description,
        starRating: row.starRating,
        category:
            row.categoryId !== null && row.categoryName !== null
                ? { id: row.categoryId, name: row.categoryName }
                : null,
        publisher:
            row.publisherId !== null && row.publisherName !== null
                ? { id: row.publisherId, name: row.publisherName }
                : null,
    };
}

function baseGamesQuery(db: Database) {
    return db
        .select(gameSelection)
        .from(games)
        .leftJoin(categories, eq(games.categoryId, categories.id))
        .leftJoin(publishers, eq(games.publisherId, publishers.id));
}

function filterCondition(filters?: GameFilters) {
    const conditions = [];

    if (filters?.categoryIds && filters.categoryIds.length > 0) {
        conditions.push(inArray(games.categoryId, filters.categoryIds));
    }

    if (filters?.publisherId !== undefined) {
        conditions.push(eq(games.publisherId, filters.publisherId));
    }

    return conditions.length > 0 ? and(...conditions) : undefined;
}

/**
 * Return games matching the optional category and publisher filters, ordered by title.
 *
 * @param db Injectable database client used to query games and their relations.
 * @param filters Optional category and publisher constraints.
 * @returns Games with their related category and publisher summaries.
 */
export async function getAllGames(db: Database, filters?: GameFilters): Promise<Game[]> {
    const condition = filterCondition(filters);
    const query = condition ? baseGamesQuery(db).where(condition) : baseGamesQuery(db);
    const rows = await query.orderBy(asc(games.title));
    return rows.map(mapGame);
}

/**
 * Return all game ids ordered by title for static route generation.
 *
 * @param db Injectable database client used to query game ids.
 * @returns Game ids in deterministic title order.
 */
export async function getAllGameIds(db: Database): Promise<number[]> {
    const rows = await db.select({ id: games.id }).from(games).orderBy(asc(games.title));
    return rows.map((row) => row.id);
}

/**
 * Find one game by id, including its category and publisher.
 *
 * @param db Injectable database client used to query the game.
 * @param id Game id to find.
 * @returns The matching game, or null when it does not exist.
 */
export async function getGameById(db: Database, id: number): Promise<Game | null> {
    const row = await baseGamesQuery(db).where(eq(games.id, id)).get();
    return row ? mapGame(row) : null;
}

/**
 * Return all categories ordered alphabetically for filter controls.
 *
 * @param db Injectable database client used to query categories.
 * @returns Category summaries in deterministic name order.
 */
export async function getAllCategories(db: Database): Promise<Category[]> {
    return db
        .select({ id: categories.id, name: categories.name })
        .from(categories)
        .orderBy(asc(categories.name));
}

/**
 * Return all publishers ordered alphabetically for filter controls.
 *
 * @param db Injectable database client used to query publishers.
 * @returns Publisher summaries in deterministic name order.
 */
export async function getAllPublishers(db: Database): Promise<Publisher[]> {
    return db
        .select({ id: publishers.id, name: publishers.name })
        .from(publishers)
        .orderBy(asc(publishers.name));
}
