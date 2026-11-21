create table public.store_policies (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  slug text not null,
  summary text not null default '',
  body text not null,
  position integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create index store_policies_store_position_idx on public.store_policies(store_id, position);

create trigger store_policies_set_updated_at before update on public.store_policies for each row execute function public.set_updated_at();

alter table public.store_policies enable row level security;

create policy "public can read visible store policies" on public.store_policies
  for select using (is_visible);

create policy "staff can manage store policies" on public.store_policies
  for all using (public.is_store_staff(store_id)) with check (public.is_store_staff(store_id));

insert into public.store_policies (store_id, title, slug, summary, body, position, is_visible)
select
  s.id,
  item.title,
  item.slug,
  item.summary,
  item.body,
  item.position,
  true
from public.stores s
cross join (
  values
    (
      'Shipping Policy',
      'shipping-policy',
      'GroovyDudz ships party decorations and celebration kits across India. Timelines depend on stock, destination and courier serviceability.',
      $$## Order processing
Orders are processed after payment confirmation and stock checks. Larger or mixed orders may need extra packing time.

## Delivery timelines
Estimated delivery varies by city and courier serviceability. Remote locations can take longer than metro deliveries.

## Address accuracy
Please provide a complete address and reachable phone number. Delivery delays can happen when courier partners cannot contact the recipient.

## Event dates
If you are ordering for a fixed event date, contact us before placing the order with your city, pincode and required date.$$,
      0
    ),
    (
      'Return & Refund Policy',
      'refund-policy',
      'Party supplies are time-sensitive, so return handling depends on product condition, delivery status and the reason for the request.',
      $$## Damaged or wrong item
If something arrives damaged or different from the ordered item, contact us with photos, order details and package images.

## Used party supplies
Opened, inflated, installed or used party supplies usually cannot be returned because they are event-use items.

## Refund review
Refunds, replacements or store-credit decisions are made after the team verifies the issue and product condition.

## How to report
Contact us with your order number, photos or videos, and a clear description of the issue.$$,
      1
    ),
    (
      'Privacy Policy',
      'privacy-policy',
      'This page explains how customer information is used for orders, support and store operations.',
      $$## Information we collect
We may collect name, phone number, email, delivery address, order details and messages you send to support.

## How information is used
Customer information is used to process orders, arrange delivery, answer questions, prevent misuse and improve the shopping experience.

## Payment information
Payment processing is handled by third-party payment providers. GroovyDudz does not need to store full card details in the storefront.

## Support requests
Messages sent to support may be used to resolve the request and maintain customer service records.$$,
      2
    ),
    (
      'Terms & Conditions',
      'terms',
      'These terms cover use of the GroovyDudz storefront, product orders and customer responsibilities.',
      $$## Product information
We work to keep images, descriptions and pricing accurate. Minor color, size or packaging variation can occur due to manufacturing and screen display differences.

## Orders and payments
Orders are accepted subject to payment confirmation, stock availability and serviceability for the delivery address.

## Customer responsibility
Please use decoration items safely, keep small parts away from children and follow setup guidance where provided.

## Changes
GroovyDudz may update products, prices, policies and site content as business requirements change.$$,
      3
    ),
    (
      'Cancellation Policy',
      'cancellation-policy',
      'Cancellation options depend on whether the order has already been packed, shipped or customized.',
      $$## Before dispatch
If your order has not been packed or shipped, contact us as soon as possible with your order number.

## After dispatch
Once shipped, cancellation may not be possible. Eligible cases are reviewed under the return and refund policy.

## Bulk or special orders
Large business orders may require advance confirmation and may not be cancellable after sourcing or packing begins.

## Request details
Please include your order number, phone number and reason when requesting cancellation.$$,
      4
    )
) as item(title, slug, summary, body, position)
where s.slug = 'groovydudz'
on conflict (store_id, slug) do nothing;
