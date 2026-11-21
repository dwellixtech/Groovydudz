import type { Policy } from "../types/api";

export const defaultPolicies: Policy[] = [
  {
    id: "policy-shipping",
    title: "Shipping Policy",
    slug: "shipping-policy",
    summary: "GroovyDudz ships party decorations and celebration kits across India. Track updates use the order number, checkout contact detail, and courier AWB once dispatched.",
    body: `## Order confirmation
Orders are accepted after successful payment confirmation and a stock check. You will receive an order number that can be used on the Track Your Order page.

## Processing time
Most ready-stock orders are packed within 1-2 working days. Bulk orders, mixed orders, sale periods, address issues or courier pickup delays may need extra time.

## Delivery timelines
Estimated delivery depends on the destination pincode and courier serviceability. Metro deliveries are usually faster than remote or restricted locations.

## Tracking updates
Before dispatch, the tracking page shows order, payment and packing status. After dispatch, courier details and AWB/tracking number are shown when available.

## Address accuracy
Please enter the full address, pincode, landmark where useful and a reachable phone number. Failed contact attempts, incomplete addresses or incorrect pincodes can delay delivery.

## Event dates
If you are ordering for a fixed party or event date, contact us before placing the order with your city, pincode and required date so we can guide you on feasibility.

## Shipping charges
Shipping charges, if any, are shown before payment at checkout. Free shipping offers apply only when the cart meets the active offer conditions.

## Delivery support
If tracking is stuck or shows an unexpected status, contact us from the Contact Us page with your order number and checkout email or mobile number.`,
    position: 0,
    is_visible: true,
    updated_at: null,
  },
  {
    id: "policy-refund",
    title: "Return & Refund Policy",
    slug: "refund-policy",
    summary: "Party supplies are time-sensitive and event-use products, so returns and refunds depend on product condition, delivery status and verification.",
    body: `## Damaged or wrong item
If a product arrives damaged, missing or different from what you ordered, contact us as soon as possible with your order number, photos or videos of the item, outer package and shipping label.

## Reporting window
Please report delivery issues promptly after receiving the package. Delayed reports may be difficult to verify with the courier or packing team.

## Non-returnable items
Opened, inflated, installed, used, torn, customized or event-used party supplies usually cannot be returned. Latex balloons, disposable decor, adhesives and opened kits are treated as event-use items.

## Refund review
Refunds, replacements, missing-item dispatch or store credit are approved only after the team verifies the issue, product condition and order record.

## Return pickup
If a return is approved, the team will confirm whether a pickup is available or whether the item needs to be sent back by the customer. Items must be returned unused and with original packing wherever applicable.

## Payment refund timeline
Approved refunds are initiated to the original payment method where possible. Bank, card, UPI or wallet timelines depend on the payment provider.

## How to report
Use the Contact Us page and include your order number, checkout email or mobile number, photos or videos, and a clear description of the issue.`,
    position: 1,
    is_visible: true,
    updated_at: null,
  },
  {
    id: "policy-privacy",
    title: "Privacy Policy",
    slug: "privacy-policy",
    summary: "This page explains how customer information is used for orders, tracking, support, marketing preferences and store operations.",
    body: `## Information we collect
We may collect your name, phone number, email, delivery address, billing details, order details, product interests, support messages and newsletter preferences.

## How information is used
Customer information is used to process payments, pack orders, arrange delivery, show tracking status, answer support questions, prevent misuse and improve the shopping experience.

## Payment information
Payments are processed through third-party payment providers such as PayU. GroovyDudz does not store full card, UPI or net-banking credentials in the storefront.

## Support requests
Messages sent through Contact Us, business enquiry forms, WhatsApp or email may be stored so the team can respond, verify order history and maintain customer service records.

## Marketing and social links
If you subscribe to updates, we may use your email to send store news or offers. You can ignore or unsubscribe from marketing communication where an unsubscribe option is provided.

## Sharing with partners
We share only the information required with logistics, payment, technology and support partners to run the store and fulfil orders.

## Data requests
For privacy questions, contact us through the footer email or Contact Us page with enough detail to identify your request.`,
    position: 2,
    is_visible: true,
    updated_at: null,
  },
  {
    id: "policy-terms",
    title: "Terms & Conditions",
    slug: "terms",
    summary: "These terms cover use of the GroovyDudz storefront, product orders, payments, tracking and customer responsibilities.",
    body: `## Product information
We work to keep images, descriptions, kit contents and pricing accurate. Minor colour, size, print, shade or packaging variation can occur because of manufacturing batches, lighting and screen display differences.

## Orders and payments
Orders are accepted subject to payment confirmation, stock availability and serviceability for the delivery address.

## Pricing and offers
Prices, discounts, shipping offers and product availability can change without prior notice. The final amount payable is shown at checkout before payment.

## Customer responsibility
Please provide accurate contact and address details, review the cart before payment, use decoration items safely, keep small parts away from children and follow setup guidance where provided.

## Tracking and delivery
Tracking information is provided for convenience and may depend on courier updates. Delivery attempts, delays, address corrections and reattempts are handled according to courier serviceability.

## Business enquiries
Bulk, corporate, planner and dealer enquiries are subject to separate confirmation of stock, quantities, pricing, packing and dispatch timelines.

## Changes
GroovyDudz may update products, prices, policies, footer contact details, social links and site content as business requirements change.`,
    position: 3,
    is_visible: true,
    updated_at: null,
  },
  {
    id: "policy-cancellation",
    title: "Cancellation Policy",
    slug: "cancellation-policy",
    summary: "Cancellation options depend on payment status, packing status, dispatch status and whether the order is bulk, customized or specially arranged.",
    body: `## Before dispatch
If your order has not been packed or shipped, contact us as soon as possible with your order number and checkout email or mobile number.

## Packed orders
Once an order is packed, cancellation may not always be possible because party kits are time-sensitive and may already be handed over for courier pickup.

## After dispatch
Once shipped, cancellation may not be possible. Eligible cases are reviewed under the return and refund policy.

## Bulk or special orders
Large business orders, dealer orders, customized assortments and specially sourced items may require advance confirmation and may not be cancellable after sourcing or packing begins.

## Payment failure or duplicate payment
If payment fails but money is debited, contact your bank or payment provider first and share the payment reference with us if the order is not created. Duplicate successful payments are reviewed against payment records.

## Request details
Please include your order number, phone number, payment reference if available and reason when requesting cancellation.`,
    position: 4,
    is_visible: true,
    updated_at: null,
  },
];
