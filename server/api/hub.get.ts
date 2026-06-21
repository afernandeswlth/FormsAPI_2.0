import { HUB_OPTIONS } from '~~/server/types/requests'

/**
 * GET /api/hub
 * Returns the seven Client Hub options shown on the landing screen.
 */
export default defineEventHandler(() => ({
  title: 'WLTH Client Hub',
  tagline: 'Impact is what we do, Lending is how we do it.',
  options: HUB_OPTIONS,
}))
