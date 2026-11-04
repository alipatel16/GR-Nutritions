import type { InfoSection } from '@/components/layout/InfoPage';
import { fullAddress, storeInfo } from '@/config/store-info';

const { delivery, damageReportHours, email, owner, phones } = storeInfo;
const contactLine = `${email} · ${phones.join(' · ')}`;

export const brandsOnShelf = [
  'MuscleBlaze',
  'Optimum Nutrition',
  'MuscleTech',
  'Dymatize',
  'Isopure',
  'Rule One Proteins',
  'GNC',
  'One Science Nutrition',
  'Transformium Nutrition',
  'C9 Nutrition',
  'Wellbeing Nutrition',
];

export const aboutValues = [
  { title: 'Genuine products only', body: 'Every product comes from the brand or its authorised distributors, sealed and within date.' },
  { title: 'Clear label information', body: 'Ingredients, serving directions and warnings are shown on every product so you can compare honestly.' },
  { title: 'Honest guidance', body: 'We help you choose for your goal and budget, and we will tell you when a doctor should be your first stop.' },
  { title: 'Secure, simple ordering', body: `Pay online through Razorpay or choose cash on delivery. Delivery is free on orders above ₹${delivery.freeAboveRupees}.` },
];

export const aboutSections: InfoSection[] = [
  {
    title: 'Who we are',
    paragraphs: [
      `GR Nutritions is a sports nutrition and wellness store based in Nikol, Ahmedabad, run by ${owner}. We help gym-goers, athletes and everyday health seekers find the right supplements, and we deliver across India.`,
      'We started GR Nutritions to make buying supplements simple and trustworthy: genuine products, fair prices, and straight answers about what each product does and who it suits.',
    ],
  },
  {
    title: 'What we sell',
    paragraphs: [
      'Whey and plant protein, mass gainers, creatine, pre-workout and post-workout support, multivitamins and daily wellness, and high-protein snacks.',
    ],
    bullets: [`Brands on our shelf include ${brandsOnShelf.join(', ')}.`],
  },
  {
    title: 'Visit or reach us',
    paragraphs: [
      `Our store: ${fullAddress}.`,
      `Phone and WhatsApp: ${phones.join(', ')}. Email: ${email}. We are available ${storeInfo.supportHours}.`,
    ],
  },
];

export const termsSections: InfoSection[] = [
  {
    title: 'About these terms',
    paragraphs: [
      `These terms apply when you browse or buy from GR Nutritions (${storeInfo.website}) and our app. GR Nutritions is operated by ${owner} from ${fullAddress}. By placing an order you agree to these terms and to our Privacy Policy.`,
    ],
  },
  {
    title: 'Your account',
    bullets: [
      'You must be 18 or older to place an order.',
      'Keep your sign-in details private. You are responsible for orders placed from your account.',
      'Give accurate contact and delivery details so we can deliver your order.',
    ],
  },
  {
    title: 'Products and health information',
    bullets: [
      'Product photos are representative. Packaging and labels can change between batches; the label on the product you receive applies.',
      'Supplements are not medicines and are not intended to diagnose, treat, cure or prevent any disease.',
      'Read the full label and follow the serving directions. If you are pregnant, breastfeeding, under 18, taking medication or have a medical condition, consult a doctor before use.',
      'Guidance on this site, including GR Coach, is general shopping information and not medical advice.',
    ],
  },
  {
    title: 'Prices and payment',
    bullets: [
      'Prices are in Indian Rupees and include applicable taxes unless stated otherwise. The MRP is shown alongside our selling price.',
      'Prices and availability can change without notice. The total shown at checkout, after the delivery check, is the amount you pay for that order.',
      'Online payments are processed securely by Razorpay. We never see or store your card or UPI details.',
      'An order is confirmed only after the payment is verified, or after a cash on delivery order is confirmed.',
    ],
  },
  {
    title: 'Delivery',
    bullets: [
      `Delivery is free on orders above ₹${delivery.freeAboveRupees}. Orders of ₹${delivery.freeAboveRupees} or less have a ₹${delivery.feeRupees} delivery charge.`,
      'We check that your pincode can be served before you pay. Delivery dates shown are estimates from our courier partners.',
      'Tracking details appear in My orders once your shipment is created.',
    ],
  },
  {
    title: 'Cash on delivery',
    bullets: [
      `Cash on delivery adds a ₹${delivery.codFeeRupees} fee to your order total.`,
      'Your account email must be verified before you can choose cash on delivery.',
      'Please pay the courier the exact amount shown in your order. Repeatedly refusing cash on delivery orders may lead us to offer only online payment.',
    ],
  },
  {
    title: 'Cancellations',
    bullets: [
      'You can ask us to cancel an order before it is shipped. Contact us with your order reference.',
      'We may cancel an order if a product is out of stock, a price was shown incorrectly, payment cannot be verified, or the address cannot be served. If you have already paid, we refund you in full.',
    ],
  },
  {
    title: 'Damaged, wrong or missing items',
    bullets: [
      `Report a damaged, leaking, wrong, expired or missing item within ${damageReportHours} hours of delivery. Share your order reference and clear photos or an unboxing video.`,
      'For your safety, opened or used supplements cannot be returned unless the product itself is defective.',
      'Once we verify the issue, we send a replacement or refund the affected item.',
    ],
  },
  {
    title: 'Refunds',
    bullets: [
      'Approved refunds go back to the original payment method. Cash on delivery refunds are paid to a bank account or UPI ID you share with us.',
      'After we approve a refund, banks and payment providers usually take 5 to 7 working days to show it in your account.',
    ],
  },
  {
    title: 'Using this site',
    bullets: [
      'Do not misuse the site, attempt unauthorised access, or copy content or product data for resale.',
      'Product names, logos and images belong to their respective brands.',
    ],
  },
  {
    title: 'Liability',
    paragraphs: [
      'To the extent the law allows, our responsibility for any order is limited to the amount you paid for it. Nothing in these terms limits your rights as a consumer under Indian law.',
    ],
  },
  {
    title: 'Governing law',
    paragraphs: [
      `These terms are governed by the laws of India. Any dispute is subject to the courts at ${storeInfo.jurisdictionCity}, Gujarat.`,
    ],
  },
  {
    title: 'Contact',
    paragraphs: [`Questions about these terms: ${contactLine}.`],
  },
];

export const privacySections: InfoSection[] = [
  {
    title: 'Who we are',
    paragraphs: [
      `GR Nutritions, operated by ${owner} from ${fullAddress}, decides how your personal data is used on this site and app. This policy explains what we collect, why, and the choices you have under the Digital Personal Data Protection Act, 2023.`,
    ],
  },
  {
    title: 'What we collect',
    bullets: [
      'Account details: your name, email address and, if you use Google sign-in, the basic profile Google shares with us.',
      'Delivery details: the names, phone numbers and addresses you save for delivery.',
      'Orders: the products you buy, totals, payment status and delivery tracking.',
      'Support messages you send us by WhatsApp, phone or email.',
      'Your cart and preferences, saved on your own device so they are there when you return.',
    ],
    paragraphs: ['We do not collect or store your card, UPI or net banking details. Razorpay handles payment information directly.'],
  },
  {
    title: 'How we use it',
    bullets: [
      'To process, deliver and support your orders, including payment verification and tracking.',
      'To manage your account, saved addresses and order history.',
      'To answer your questions and resolve order issues.',
      'To prevent fraud and misuse, and to meet legal, tax and accounting requirements.',
    ],
  },
  {
    title: 'Who we share it with',
    paragraphs: ['We share only what each service needs to do its job, and we never sell your personal data.'],
    bullets: [
      'Razorpay, to process online payments.',
      'Shiprocket and its courier partners, to deliver your order (name, phone and delivery address).',
      'Google Firebase, for sign-in and website hosting.',
      'Supabase, for our store database and product images.',
      'Government authorities, only when the law requires it.',
    ],
  },
  {
    title: 'How we protect it',
    paragraphs: [
      'Data is sent over encrypted connections. Only you can see your addresses and orders, and only authorised GR Nutritions staff can access order details to fulfil them.',
    ],
  },
  {
    title: 'How long we keep it',
    paragraphs: [
      'We keep your account data while your account is active. Order and invoice records are kept for as long as Indian tax and accounting laws require, then deleted.',
    ],
  },
  {
    title: 'Your rights',
    bullets: [
      'Ask for a summary of the personal data we hold about you.',
      'Correct or update your details. You can edit saved addresses yourself in your account.',
      'Ask us to delete your account and data, except records we must keep by law.',
      'Withdraw consent, and nominate someone to exercise these rights on your behalf.',
    ],
    paragraphs: [`To make a request, email ${email} from your account email address.`],
  },
  {
    title: 'Children',
    paragraphs: ['Our store is for adults. We do not knowingly collect personal data from anyone under 18.'],
  },
  {
    title: 'Grievance officer',
    paragraphs: [
      `${owner}, GR Nutritions, ${fullAddress}. Email ${email}, phone ${phones.join(' or ')}. We acknowledge complaints promptly and resolve them within the time required by law.`,
    ],
  },
  {
    title: 'Changes to this policy',
    paragraphs: ['We will update this page if our practices change and show the new date at the top.'],
  },
];

export const helpTopics: { question: string; answer: string }[] = [
  {
    question: 'Where is my order?',
    answer: 'Open My orders to see its status. Once it ships, the courier name, tracking number and a Track delivery button appear there. Tap Refresh order status for the latest update.',
  },
  {
    question: 'Money was deducted but my order says Awaiting payment',
    answer: 'Some payments take a few minutes to confirm. Tap Refresh order status in My orders. If it still has not updated after 30 minutes, contact us with your order reference; any payment that does not complete is refunded by Razorpay.',
  },
  {
    question: 'Can I cancel my order?',
    answer: 'Yes, until it is shipped. Message us on WhatsApp or call with your order reference and we will cancel it. Paid orders are refunded in full.',
  },
  {
    question: 'I received a damaged, wrong or missing item',
    answer: `Contact us within ${damageReportHours} hours of delivery with your order reference and photos or an unboxing video. We will send a replacement or refund once we verify it.`,
  },
  {
    question: 'How much is delivery?',
    answer: `Free on orders above ₹${delivery.freeAboveRupees}; otherwise ₹${delivery.feeRupees}. Cash on delivery adds ₹${delivery.codFeeRupees}. The exact total is shown when you check delivery at checkout.`,
  },
  {
    question: 'Why can’t I choose cash on delivery?',
    answer: 'Cash on delivery needs a verified email. Open your account, verify your email from the link we sent, then return to checkout.',
  },
  {
    question: 'How do I know a product is genuine?',
    answer: 'We stock only sealed products from the brand or its authorised distributors. Check the batch number, expiry date and the brand’s authenticity code on the pack. If anything looks wrong, contact us before opening it.',
  },
];
