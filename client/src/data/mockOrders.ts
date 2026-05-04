export type ProductStatus = 'pending' | 'partial' | 'completed'

export type OrderProduct = {
  id: string
  name: string
  description?: string
  category: 'bebida' | 'comida' | 'extra'
  total: number
  retrieved: number
}

export type Order = {
  id: string
  token: string
  customerName: string
  createdAt: string
  pickupPoint?: string
  status: ProductStatus
  products: OrderProduct[]
}

export const mockOrders: Order[] = [
  {
    id: 'ord_001',
    token: 'DNX-A1B2C3',
    customerName: 'Lucía Fernández',
    createdAt: '2026-05-04T19:32:00Z',
    pickupPoint: 'Barra principal',
    status: 'pending',
    products: [
      { id: 'p1', name: 'Cerveza Stella', category: 'bebida', total: 3, retrieved: 0 },
      { id: 'p2', name: 'Gin Tonic', description: 'Hendrick’s + tónica', category: 'bebida', total: 2, retrieved: 0 },
      { id: 'p3', name: 'Papas bravas', category: 'comida', total: 1, retrieved: 0 },
      { id: 'p4', name: 'Tabla de quesos', category: 'comida', total: 1, retrieved: 0 },
    ],
  },
  {
    id: 'ord_002',
    token: 'DNX-X9Y8Z7',
    customerName: 'Mateo Sosa',
    createdAt: '2026-05-04T20:10:00Z',
    pickupPoint: 'Cocina',
    status: 'partial',
    products: [
      { id: 'p1', name: 'Aperol Spritz', category: 'bebida', total: 4, retrieved: 2 },
      { id: 'p2', name: 'Empanadas (carne)', category: 'comida', total: 6, retrieved: 6 },
      { id: 'p3', name: 'Agua sin gas', category: 'bebida', total: 2, retrieved: 0 },
    ],
  },
  {
    id: 'ord_003',
    token: 'DNX-DONE99',
    customerName: 'Camila Pérez',
    createdAt: '2026-05-04T18:00:00Z',
    pickupPoint: 'Takeaway',
    status: 'completed',
    products: [
      { id: 'p1', name: 'Café americano', category: 'bebida', total: 2, retrieved: 2 },
      { id: 'p2', name: 'Medialunas', category: 'comida', total: 3, retrieved: 3 },
    ],
  },
]

export function findOrderByToken(token: string): Order | undefined {
  return mockOrders.find((o) => o.token.toUpperCase() === token.trim().toUpperCase())
}

export function computeOrderStatus(products: OrderProduct[]): ProductStatus {
  const totalQty = products.reduce((s, p) => s + p.total, 0)
  const retrievedQty = products.reduce((s, p) => s + p.retrieved, 0)
  if (retrievedQty === 0) return 'pending'
  if (retrievedQty >= totalQty) return 'completed'
  return 'partial'
}
