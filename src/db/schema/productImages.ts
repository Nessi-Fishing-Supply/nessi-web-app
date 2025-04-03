import { pgTable, uuid, text, timestamp } from 'drizzle-orm/pg-core';
import { products } from './products';
import { relations } from 'drizzle-orm';

export const productImages = pgTable('product_images', {
  id: uuid('id').defaultRandom().primaryKey(),
  imageUrl: text('image_url').notNull(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const productImageRelations = relations(productImages, ({ one }) => ({
  product: one(products, {
    fields: [productImages.productId],
    references: [products.id],
  }),
}));
