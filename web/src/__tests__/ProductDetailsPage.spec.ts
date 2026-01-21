import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createRouter, createWebHistory } from 'vue-router'
import { createPinia, setActivePinia } from 'pinia'
import ProductDetailsPage from '../pages/ProductDetailsPage.vue'
import { useAuthStore } from '../stores/auth'
import * as productsApi from '../api/products'
import * as offersApi from '../api/offers'
import {
  createAvailableProduct,
  createSoldProduct,
  createOwnProduct,
  createProductWithPendingOfferFromBuyer,
  createProductWithCounterFromSeller,
  createProductWithAcceptedOffer,
  testUsers,
} from './utils/productFixtures'

vi.mock('../api/products')
vi.mock('../api/offers')

const mockGetProduct = productsApi.getProduct as Mock
const mockCreateOffer = offersApi.createOffer as Mock
const mockCounterOffer = offersApi.counterOffer as Mock
const mockAcceptOffer = offersApi.acceptOffer as Mock
const mockPurchaseProduct = offersApi.purchaseProduct as Mock

function createTestRouter() {
  return createRouter({
    history: createWebHistory(),
    routes: [
      { path: '/products/:id', component: ProductDetailsPage },
      { path: '/products', component: { template: '<div>Products</div>' } },
      { path: '/login', component: { template: '<div>Login</div>' } },
    ],
  })
}

async function mountPage(productId = 1) {
  const router = createTestRouter()
  await router.push(`/products/${productId}`)
  await router.isReady()

  const wrapper = mount(ProductDetailsPage, {
    global: {
      plugins: [router],
      stubs: {
        PageLayout: {
          template: '<div class="page-layout"><slot /></div>',
        },
        AppButton: {
          template: '<button :disabled="disabled" @click="$emit(\'click\')"><slot /></button>',
          props: ['disabled', 'variant'],
        },
        AppInput: {
          template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
          props: ['modelValue', 'type', 'placeholder', 'error', 'label'],
        },
        AppBadge: {
          template: '<span class="badge"><slot /></span>',
          props: ['variant'],
        },
        AppCard: {
          template: '<div class="card"><slot /></div>',
        },
        NegotiationTimeline: {
          template: '<div class="timeline" />',
          props: ['events', 'askingPrice'],
        },
      },
    },
  })

  await flushPromises()
  return { wrapper, router }
}

describe('ProductDetailsPage', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  describe('Loading and Error States', () => {
    it('shows loading state while fetching', async () => {
      mockGetProduct.mockReturnValue(new Promise(() => {}))

      const { wrapper } = await mountPage()

      expect(wrapper.text()).toContain('Loading product...')
    })

    it('shows error message when API fails', async () => {
      mockGetProduct.mockRejectedValue(new Error('Network error'))

      const { wrapper } = await mountPage()
      await flushPromises()

      expect(wrapper.text()).toContain('Network error')
    })
  })

  describe('Seller View', () => {
    beforeEach(() => {
      const authStore = useAuthStore()
      authStore.user = testUsers.seller
      authStore.token = 'test-token'
    })

    it('shows "This is your listing" for own products', async () => {
      const product = createOwnProduct(testUsers.seller.id)
      mockGetProduct.mockResolvedValue(product)

      const { wrapper } = await mountPage()
      await flushPromises()

      expect(wrapper.text()).toContain('This is your listing')
    })

    it('shows Accept and Counter buttons when buyer has pending offer', async () => {
      const product = createProductWithPendingOfferFromBuyer(
        testUsers.buyer.id,
        testUsers.buyer.name,
        5000,
        { sellerId: testUsers.seller.id }
      )
      mockGetProduct.mockResolvedValue(product)

      const { wrapper } = await mountPage()
      await flushPromises()

      expect(wrapper.text()).toContain('Accept Offer')
      expect(wrapper.text()).toContain('Counter')
    })

    it('shows counter form when Counter button is clicked', async () => {
      const product = createProductWithPendingOfferFromBuyer(
        testUsers.buyer.id,
        testUsers.buyer.name,
        5000,
        { sellerId: testUsers.seller.id }
      )
      mockGetProduct.mockResolvedValue(product)

      const { wrapper } = await mountPage()
      await flushPromises()

      const counterButton = wrapper.findAll('button').find(b => b.text() === 'Counter')
      await counterButton?.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Send Counter')
      expect(wrapper.text()).toContain('Cancel')
    })

    it('submits counter offer correctly', async () => {
      const product = createProductWithPendingOfferFromBuyer(
        testUsers.buyer.id,
        testUsers.buyer.name,
        5000,
        { sellerId: testUsers.seller.id }
      )
      mockGetProduct.mockResolvedValue(product)
      mockCounterOffer.mockResolvedValue({ id: 2, amount: 7500 })

      const { wrapper } = await mountPage()
      await flushPromises()

      const counterButton = wrapper.findAll('button').find(b => b.text() === 'Counter')
      await counterButton?.trigger('click')
      await flushPromises()

      const input = wrapper.find('input')
      await input.setValue('75')

      const sendButton = wrapper.findAll('button').find(b => b.text() === 'Send Counter')
      await sendButton?.trigger('click')
      await flushPromises()
    })

    it('accepts offer when Accept button is clicked', async () => {
      const product = createProductWithPendingOfferFromBuyer(
        testUsers.buyer.id,
        testUsers.buyer.name,
        5000,
        { sellerId: testUsers.seller.id }
      )
      mockGetProduct.mockResolvedValue(product)
      mockAcceptOffer.mockResolvedValue({ success: true, offerId: 1, amount: 5000 })

      const { wrapper } = await mountPage()
      await flushPromises()

      const acceptButton = wrapper.findAll('button').find(b => b.text() === 'Accept Offer')
      await acceptButton?.trigger('click')
      await flushPromises()
    })
  })

  describe('Buyer View - Available Product', () => {
    beforeEach(() => {
      const authStore = useAuthStore()
      authStore.user = testUsers.buyer
      authStore.token = 'test-token'
    })

    it('shows Make an Offer and Buy Now for available products', async () => {
      const product = createAvailableProduct()
      mockGetProduct.mockResolvedValue(product)

      const { wrapper } = await mountPage()
      await flushPromises()

      expect(wrapper.text()).toContain('Make an Offer')
      expect(wrapper.text()).toContain('Buy Now')
      expect(wrapper.text()).toContain('$100')
    })

    it('shows offer form when Make an Offer is clicked', async () => {
      const product = createAvailableProduct()
      mockGetProduct.mockResolvedValue(product)

      const { wrapper } = await mountPage()
      await flushPromises()

      const offerButton = wrapper.findAll('button').find(b => b.text() === 'Make an Offer')
      await offerButton?.trigger('click')
      await flushPromises()

      expect(wrapper.text()).toContain('Submit Offer')
      expect(wrapper.text()).toContain('Cancel')
    })

    it('submits offer correctly', async () => {
      const product = createAvailableProduct()
      mockGetProduct.mockResolvedValue(product)
      mockCreateOffer.mockResolvedValue({ id: 1, amount: 8000 })

      const { wrapper } = await mountPage()
      await flushPromises()

      const offerButton = wrapper.findAll('button').find(b => b.text() === 'Make an Offer')
      await offerButton?.trigger('click')
      await flushPromises()

      const input = wrapper.find('input')
      await input.setValue('80')

      const submitButton = wrapper.findAll('button').find(b => b.text() === 'Submit Offer')
      await submitButton?.trigger('click')
      await flushPromises()
    })

    it('completes direct purchase for available product', async () => {
      const product = createAvailableProduct()
      mockGetProduct.mockResolvedValue(product)
      mockPurchaseProduct.mockResolvedValue({ transactionId: 1, finalPrice: 10000 })

      const { wrapper } = await mountPage()
      await flushPromises()

      const buyButton = wrapper.findAll('button').find(b => b.text().includes('Buy Now'))
      await buyButton?.trigger('click')
      await flushPromises()
    })
  })

  describe('Buyer View - Negotiation in Progress', () => {
    beforeEach(() => {
      const authStore = useAuthStore()
      authStore.user = testUsers.buyer
      authStore.token = 'test-token'
    })

    it('shows waiting message when awaiting seller response', async () => {
      const product = createProductWithPendingOfferFromBuyer(
        testUsers.buyer.id,
        testUsers.buyer.name,
        5000
      )
      product.offers[0]!.canCounter = false
      product.offers[0]!.canAccept = false
      mockGetProduct.mockResolvedValue(product)

      const { wrapper } = await mountPage()
      await flushPromises()

      expect(wrapper.text()).toContain('Waiting for response...')
    })

    it('shows Accept and Counter when seller has countered', async () => {
      const product = createProductWithCounterFromSeller(
        testUsers.buyer.id,
        testUsers.buyer.name,
        7500
      )
      mockGetProduct.mockResolvedValue(product)

      const { wrapper } = await mountPage()
      await flushPromises()

      expect(wrapper.text()).toContain('Accept Offer')
      expect(wrapper.text()).toContain('Counter')
    })

    it('accepts counter offer when Accept is clicked', async () => {
      const product = createProductWithCounterFromSeller(
        testUsers.buyer.id,
        testUsers.buyer.name,
        7500
      )
      mockGetProduct.mockResolvedValue(product)
      mockAcceptOffer.mockResolvedValue({ success: true, offerId: 1, amount: 7500 })

      const { wrapper } = await mountPage()
      await flushPromises()

      const acceptButton = wrapper.findAll('button').find(b => b.text() === 'Accept Offer')
      await acceptButton?.trigger('click')
      await flushPromises()
    })
  })

  describe('Buyer View - Accepted Offer', () => {
    beforeEach(() => {
      const authStore = useAuthStore()
      authStore.user = testUsers.buyer
      authStore.token = 'test-token'
    })

    it('shows Buy Now with accepted price', async () => {
      const product = createProductWithAcceptedOffer(
        testUsers.buyer.id,
        testUsers.buyer.name,
        7500
      )
      mockGetProduct.mockResolvedValue(product)

      const { wrapper } = await mountPage()
      await flushPromises()

      expect(wrapper.text()).toContain('Buy Now')
      expect(wrapper.text()).toContain('$75')
    })

    it('completes purchase with accepted offer', async () => {
      const product = createProductWithAcceptedOffer(
        testUsers.buyer.id,
        testUsers.buyer.name,
        7500
      )
      mockGetProduct.mockResolvedValue(product)
      mockPurchaseProduct.mockResolvedValue({ transactionId: 1, finalPrice: 7500 })

      const { wrapper } = await mountPage()
      await flushPromises()

      const buyButton = wrapper.findAll('button').find(b => b.text().includes('Buy Now'))
      await buyButton?.trigger('click')
      await flushPromises()
    })
  })

  describe('Product Sold State', () => {
    beforeEach(() => {
      const authStore = useAuthStore()
      authStore.user = testUsers.buyer
      authStore.token = 'test-token'
    })

    it('shows sold message', async () => {
      const product = createSoldProduct()
      mockGetProduct.mockResolvedValue(product)

      const { wrapper } = await mountPage()
      await flushPromises()

      expect(wrapper.text()).toContain('This item has been sold')
    })

    it('does not show action buttons', async () => {
      const product = createSoldProduct()
      mockGetProduct.mockResolvedValue(product)

      const { wrapper } = await mountPage()
      await flushPromises()

      expect(wrapper.text()).not.toContain('Make an Offer')
      expect(wrapper.text()).not.toContain('Buy Now')
    })
  })

  describe('Product Display', () => {
    beforeEach(() => {
      const authStore = useAuthStore()
      authStore.user = testUsers.buyer
      authStore.token = 'test-token'
    })

    it('displays product name and price', async () => {
      const product = createAvailableProduct({
        name: 'Vintage Chair',
        price: 25000,
      })
      mockGetProduct.mockResolvedValue(product)

      const { wrapper } = await mountPage()
      await flushPromises()

      expect(wrapper.text()).toContain('Vintage Chair')
      expect(wrapper.text()).toContain('$250')
    })

    it('displays product description', async () => {
      const product = createAvailableProduct({
        description: 'A beautiful vintage chair',
      })
      mockGetProduct.mockResolvedValue(product)

      const { wrapper } = await mountPage()
      await flushPromises()

      expect(wrapper.text()).toContain('A beautiful vintage chair')
    })

    it('displays seller name', async () => {
      const product = createAvailableProduct({
        sellerName: 'John Seller',
      })
      mockGetProduct.mockResolvedValue(product)

      const { wrapper } = await mountPage()
      await flushPromises()

      expect(wrapper.text()).toContain('John Seller')
    })
  })
})
