import { get, post } from '@/libs/fetch';
import type {
  Offer,
  OfferWithDetails,
  CreateOfferParams,
  CounterOfferParams,
} from '@/features/messaging/types/offer';

export const createOffer = async (params: CreateOfferParams): Promise<Offer> =>
  post<Offer>('/api/offers', params);

export const getOffer = async (offerId: string): Promise<OfferWithDetails> =>
  get<OfferWithDetails>(`/api/offers/${offerId}`);

export const acceptOffer = async (offerId: string): Promise<Offer> =>
  post<Offer>(`/api/offers/${offerId}/accept`);

export const declineOffer = async (offerId: string): Promise<Offer> =>
  post<Offer>(`/api/offers/${offerId}/decline`);

export const counterOffer = async (offerId: string, params: CounterOfferParams): Promise<Offer> =>
  post<Offer>(`/api/offers/${offerId}/counter`, params);
