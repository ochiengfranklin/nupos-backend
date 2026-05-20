import {
    pgTable,
    uuid,
    varchar,
    text,
    boolean,
    integer,
    numeric,
    timestamp,
    pgEnum,
    uniqueIndex,
    index,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// Enums are defined at the database level — PostgreSQL enforces valid values

export const userRoleEnum = pgEnum('user_role', [
    'OWNER',
    'MANAGER',
    'CASHIER',
    'STOREKEEPER',
])

export const saleStatusEnum = pgEnum('sale_status', [
    'COMPLETED',
    'REFUNDED',
    'VOIDED',
])

export const paymentMethodEnum = pgEnum('payment_method', [
    'CASH',
    'MPESA',
    'CARD',
    'BANK_TRANSFER',
])

export const paymentStatusEnum = pgEnum('payment_status', [
    'PENDING',
    'COMPLETED',
    'FAILED',
])

export const inventoryMovementTypeEnum = pgEnum('inventory_movement_type', [
    'SALE',         // stock reduced by a sale
    'RESTOCK',      // stock added manually or via purchase order
    'ADJUSTMENT',   // manual correction
    'RETURN',       // customer returned an item
    'DAMAGE',       // stock written off as damaged
])

export const purchaseOrderStatusEnum = pgEnum('purchase_order_status', [
    'DRAFT',
    'ORDERED',
    'RECEIVED',
    'CANCELLED',
])

export const loyaltyTransactionTypeEnum = pgEnum('loyalty_transaction_type', [
    'EARNED',
    'REDEEMED',
    'ADJUSTED',
    'EXPIRED',
])

// One row = one business. The anchor of the entire multi-tenant system.

export const shops = pgTable('shops', {
    id:            uuid('id').primaryKey().defaultRandom(),
    name:          varchar('name', { length: 255 }).notNull(),
    slug:          varchar('slug', { length: 100 }).notNull().unique(),
    phone:         varchar('phone', { length: 20 }),
    email:         varchar('email', { length: 255 }),
    address:       text('address'),
    city:          varchar('city', { length: 100 }),
    country:       varchar('country', { length: 100 }).default('Kenya'),
    currency:      varchar('currency', { length: 10 }).default('KES'),
    tillNumber:    varchar('till_number', { length: 20 }),
    taxRate:       numeric('tax_rate', { precision: 5, scale: 2 }).default('0'),
    receiptFooter: text('receipt_footer'),
    logoUrl:       text('logo_url'),
    isActive:      boolean('is_active').notNull().default(true),
    createdAt:     timestamp('created_at').notNull().defaultNow(),
    updatedAt:     timestamp('updated_at').notNull().defaultNow(),
})

// Employees of a shop. Role controls what they can access.

export const users = pgTable('users', {
    id:           uuid('id').primaryKey().defaultRandom(),
    shopId:       uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    name:         varchar('name', { length: 255 }).notNull(),
    email:        varchar('email', { length: 255 }).notNull(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    role:         userRoleEnum('role').notNull().default('CASHIER'),
    isActive:     boolean('is_active').notNull().default(true),
    createdAt:    timestamp('created_at').notNull().defaultNow(),
    updatedAt:    timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    // A user's email must be unique within a shop
    // Two different shops CAN have users with the same email
    uniqueIndex('users_shop_email_idx').on(table.shopId, table.email),
    index('users_shop_id_idx').on(table.shopId),
])

//Categories

export const categories = pgTable('categories', {
    id:          uuid('id').primaryKey().defaultRandom(),
    shopId:      uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    name:        varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isActive:    boolean('is_active').notNull().default(true),
    createdAt:   timestamp('created_at').notNull().defaultNow(),
    updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    index('categories_shop_id_idx').on(table.shopId),
])

export const products = pgTable('products', {
    id:                uuid('id').primaryKey().defaultRandom(),
    shopId:            uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    categoryId:        uuid('category_id').references(() => categories.id, { onDelete: 'set null' }),
    name:              varchar('name', { length: 255 }).notNull(),
    description:       text('description'),
    sku:               varchar('sku', { length: 100 }),
    barcode:           varchar('barcode', { length: 100 }),
    price:             numeric('price', { precision: 12, scale: 2 }).notNull(),
    costPrice:         numeric('cost_price', { precision: 12, scale: 2 }).notNull().default('0'),
    stockQuantity:     integer('stock_quantity').notNull().default(0),
    lowStockThreshold: integer('low_stock_threshold').notNull().default(5),
    isActive:          boolean('is_active').notNull().default(true),
    createdAt:         timestamp('created_at').notNull().defaultNow(),
    updatedAt:         timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    // SKU must be unique per shop — two shops can have same SKU but one shop cannot
    uniqueIndex('products_shop_sku_idx').on(table.shopId, table.sku),
    index('products_shop_id_idx').on(table.shopId),
    index('products_category_id_idx').on(table.categoryId),
])

export const customers = pgTable('customers', {
    id:            uuid('id').primaryKey().defaultRandom(),
    shopId:        uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    name:          varchar('name', { length: 255 }).notNull(),
    phone:         varchar('phone', { length: 20 }),
    email:         varchar('email', { length: 255 }),
    totalSpent:    numeric('total_spent', { precision: 14, scale: 2 }).notNull().default('0'),
    loyaltyPoints: integer('loyalty_points').notNull().default(0),
    isActive:      boolean('is_active').notNull().default(true),
    createdAt:     timestamp('created_at').notNull().defaultNow(),
    updatedAt:     timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    index('customers_shop_id_idx').on(table.shopId),
    index('customers_phone_idx').on(table.phone),
])

//  Suppliers
export const suppliers = pgTable('suppliers', {
    id:          uuid('id').primaryKey().defaultRandom(),
    shopId:      uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    name:        varchar('name', { length: 255 }).notNull(),
    contact:     varchar('contact', { length: 100 }),
    phone:       varchar('phone', { length: 20 }),
    email:       varchar('email', { length: 255 }),
    address:     text('address'),
    notes:       text('notes'),
    isActive:    boolean('is_active').notNull().default(true),
    createdAt:   timestamp('created_at').notNull().defaultNow(),
    updatedAt:   timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    index('suppliers_shop_id_idx').on(table.shopId),
])

// Purchase orders
export const purchaseOrders = pgTable('purchase_orders', {
    id:            uuid('id').primaryKey().defaultRandom(),
    shopId:        uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    supplierId:    uuid('supplier_id').references(() => suppliers.id, { onDelete: 'set null' }),
    orderNumber:   varchar('order_number', { length: 50 }).notNull().unique(),
    status:        purchaseOrderStatusEnum('status').notNull().default('DRAFT'),
    totalAmount:   numeric('total_amount', { precision: 14, scale: 2 }).notNull().default('0'),
    notes:         text('notes'),
    orderedAt:     timestamp('ordered_at'),
    receivedAt:    timestamp('received_at'),
    createdBy:     uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
    createdAt:     timestamp('created_at').notNull().defaultNow(),
    updatedAt:     timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    index('po_shop_id_idx').on(table.shopId),
    index('po_supplier_id_idx').on(table.supplierId),
])

// Purchase order items
export const purchaseOrderItems = pgTable('purchase_order_items', {
    id:                uuid('id').primaryKey().defaultRandom(),
    purchaseOrderId:   uuid('purchase_order_id').notNull().references(() => purchaseOrders.id, { onDelete: 'cascade' }),
    productId:         uuid('product_id').notNull().references(() => products.id),
    quantity:          integer('quantity').notNull(),
    unitCost:          numeric('unit_cost', { precision: 12, scale: 2 }).notNull(),
    totalCost:         numeric('total_cost', { precision: 14, scale: 2 }).notNull(),
    receivedQty:       integer('received_qty').notNull().default(0),
    createdAt:         timestamp('created_at').notNull().defaultNow(),
}, (table) => [
    index('poi_purchase_order_id_idx').on(table.purchaseOrderId),
    index('poi_product_id_idx').on(table.productId),
])

// The header record. Individual items live in sale_items.

export const sales = pgTable('sales', {
    id:             uuid('id').primaryKey().defaultRandom(),
    shopId:         uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    cashierId:      uuid('cashier_id').notNull().references(() => users.id),
    customerId:     uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    receiptNumber:  varchar('receipt_number', { length: 50 }).notNull().unique(),
    subtotal:       numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
    taxAmount:      numeric('tax_amount', { precision: 14, scale: 2 }).notNull().default('0'),
    discountAmount: numeric('discount_amount', { precision: 14, scale: 2 }).notNull().default('0'),
    totalAmount:    numeric('total_amount', { precision: 14, scale: 2 }).notNull(),
    status:         saleStatusEnum('status').notNull().default('COMPLETED'),
    paymentMethod:  paymentMethodEnum('payment_method').notNull(),
    notes:          text('notes'),
    createdAt:      timestamp('created_at').notNull().defaultNow(),
    updatedAt:      timestamp('updated_at').notNull().defaultNow(),
}, (table) => [
    index('sales_shop_id_idx').on(table.shopId),
    index('sales_cashier_id_idx').on(table.cashierId),
    index('sales_created_at_idx').on(table.createdAt),
    index('sales_shop_created_idx').on(table.shopId, table.createdAt),
])

// One row per product line in a sale.

export const saleItems = pgTable('sale_items', {
    id:        uuid('id').primaryKey().defaultRandom(),
    saleId:    uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id),
    quantity:  integer('quantity').notNull(),
    unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
    subtotal:  numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
    index('sale_items_sale_id_idx').on(table.saleId),
    index('sale_items_product_id_idx').on(table.productId),
])

export const payments = pgTable('payments', {
    id:        uuid('id').primaryKey().defaultRandom(),
    saleId:    uuid('sale_id').notNull().references(() => sales.id, { onDelete: 'cascade' }),
    method:    paymentMethodEnum('method').notNull(),
    amount:    numeric('amount', { precision: 14, scale: 2 }).notNull(),
    reference: varchar('reference', { length: 255 }), // M-Pesa transaction code etc.
    status:    paymentStatusEnum('status').notNull().default('COMPLETED'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => [
    index('payments_sale_id_idx').on(table.saleId),
])

// Audit trail. Every stock change is recorded here permanently.

export const inventoryMovements = pgTable('inventory_movements', {
    id:           uuid('id').primaryKey().defaultRandom(),
    shopId:       uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    productId:    uuid('product_id').notNull().references(() => products.id),
    userId:       uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    type:         inventoryMovementTypeEnum('type').notNull(),
    quantity:     integer('quantity').notNull(), // positive = added, negative = removed
    stockBefore:  integer('stock_before').notNull(),
    stockAfter:   integer('stock_after').notNull(),
    reason:       text('reason'),
    referenceId:  uuid('reference_id'), // sale_id if type = SALE
    createdAt:    timestamp('created_at').notNull().defaultNow(),
}, (table) => [
    index('inv_movements_shop_id_idx').on(table.shopId),
    index('inv_movements_product_id_idx').on(table.productId),
    index('inv_movements_created_at_idx').on(table.createdAt),
])

// Loyalty transactions

export const loyaltyTransactions = pgTable('loyalty_transactions', {
    id:            uuid('id').primaryKey().defaultRandom(),
    shopId:        uuid('shop_id').notNull().references(() => shops.id, { onDelete: 'cascade' }),
    customerId:    uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
    saleId:        uuid('sale_id').references(() => sales.id, { onDelete: 'set null' }),
    type:          loyaltyTransactionTypeEnum('type').notNull(),
    points:        integer('points').notNull(),
    balanceBefore: integer('balance_before').notNull(),
    balanceAfter:  integer('balance_after').notNull(),
    note:          text('note'),
    createdAt:     timestamp('created_at').notNull().defaultNow(),
}, (table) => [
    index('loyalty_customer_idx').on(table.customerId),
    index('loyalty_shop_idx').on(table.shopId),
])

// Shop loyalty settings
export const loyaltySettings = pgTable('loyalty_settings', {
    id:                   uuid('id').primaryKey().defaultRandom(),
    shopId:               uuid('shop_id').notNull().unique().references(() => shops.id, { onDelete: 'cascade' }),
    isEnabled:            boolean('is_enabled').notNull().default(true),
    pointsPerHundred:     integer('points_per_hundred').notNull().default(10),
    pointsRedemptionRate: integer('points_redemption_rate').notNull().default(1),
    minimumRedemption:    integer('minimum_redemption').notNull().default(100),
    createdAt:            timestamp('created_at').notNull().defaultNow(),
    updatedAt:            timestamp('updated_at').notNull().defaultNow(),
})

// These tell Drizzle how tables connect — enables typed joins

export const shopsRelations = relations(shops, ({ many, one }) => ({
    users:               many(users),
    categories:          many(categories),
    products:            many(products),
    sales:               many(sales),
    customers:           many(customers),
    inventoryMovements:  many(inventoryMovements),
    suppliers:           many(suppliers),
    purchaseOrders:      many(purchaseOrders),
    loyaltyTransactions: many(loyaltyTransactions),
    loyaltySettings:     one(loyaltySettings),
}))

export const usersRelations = relations(users, ({ one, many }) => ({
    shop:           one(shops, { fields: [users.shopId], references: [shops.id] }),
    sales:          many(sales),
    purchaseOrders: many(purchaseOrders),
}))

export const categoriesRelations = relations(categories, ({ one, many }) => ({
    shop:     one(shops, { fields: [categories.shopId], references: [shops.id] }),
    products: many(products),
}))

export const productsRelations = relations(products, ({ one, many }) => ({
    shop:               one(shops,      { fields: [products.shopId],      references: [shops.id] }),
    category:           one(categories, { fields: [products.categoryId],  references: [categories.id] }),
    saleItems:          many(saleItems),
    inventoryMovements: many(inventoryMovements),
    purchaseOrderItems: many(purchaseOrderItems),
}))

export const customersRelations = relations(customers, ({ one, many }) => ({
    shop:                one(shops, { fields: [customers.shopId], references: [shops.id] }),
    sales:               many(sales),
    loyaltyTransactions: many(loyaltyTransactions),
}))

export const salesRelations = relations(sales, ({ one, many }) => ({
    shop:                one(shops,     { fields: [sales.shopId],     references: [shops.id] }),
    cashier:             one(users,     { fields: [sales.cashierId],  references: [users.id] }),
    customer:            one(customers, { fields: [sales.customerId], references: [customers.id] }),
    saleItems:           many(saleItems),
    payments:            many(payments),
    loyaltyTransactions: many(loyaltyTransactions),
}))

export const saleItemsRelations = relations(saleItems, ({ one }) => ({
    sale:    one(sales,    { fields: [saleItems.saleId],    references: [sales.id] }),
    product: one(products, { fields: [saleItems.productId], references: [products.id] }),
}))

export const paymentsRelations = relations(payments, ({ one }) => ({
    sale: one(sales, { fields: [payments.saleId], references: [sales.id] }),
}))

export const inventoryMovementsRelations = relations(inventoryMovements, ({ one }) => ({
    shop:    one(shops,    { fields: [inventoryMovements.shopId],    references: [shops.id] }),
    product: one(products, { fields: [inventoryMovements.productId], references: [products.id] }),
    user:    one(users,    { fields: [inventoryMovements.userId],    references: [users.id] }),
}))

export const suppliersRelations = relations(suppliers, ({ one, many }) => ({
    shop:           one(shops,          { fields: [suppliers.shopId],    references: [shops.id] }),
    purchaseOrders: many(purchaseOrders),
}))

export const purchaseOrdersRelations = relations(purchaseOrders, ({ one, many }) => ({
    shop:     one(shops,     { fields: [purchaseOrders.shopId],     references: [shops.id] }),
    supplier: one(suppliers, { fields: [purchaseOrders.supplierId], references: [suppliers.id] }),
    items:    many(purchaseOrderItems),
    creator:  one(users,     { fields: [purchaseOrders.createdBy],  references: [users.id] }),
}))

export const purchaseOrderItemsRelations = relations(purchaseOrderItems, ({ one }) => ({
    purchaseOrder: one(purchaseOrders, { fields: [purchaseOrderItems.purchaseOrderId], references: [purchaseOrders.id] }),
    product:       one(products,       { fields: [purchaseOrderItems.productId],       references: [products.id] }),
}))

export const loyaltyTransactionsRelations = relations(loyaltyTransactions, ({ one }) => ({
    shop:     one(shops,     { fields: [loyaltyTransactions.shopId],     references: [shops.id] }),
    customer: one(customers, { fields: [loyaltyTransactions.customerId], references: [customers.id] }),
    sale:     one(sales,     { fields: [loyaltyTransactions.saleId],     references: [sales.id] }),
}))

export const loyaltySettingsRelations = relations(loyaltySettings, ({ one }) => ({
    shop: one(shops, { fields: [loyaltySettings.shopId], references: [shops.id] }),
}))