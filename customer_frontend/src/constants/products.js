import {
  ArrowLeftRight,
  BadgeCheck,
  CalendarClock,
  ChartNoAxesColumn,
  CreditCard,
  Lock,
  PiggyBank,
  Receipt,
  ShieldCheck,
  Snowflake,
  Sparkles,
  Timer,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { ROUTES } from '../routes/paths';
import accountArt from '../assets/images/dashboard-preview.png';
import cardArt from '../assets/images/card-art.png';
import loanArt from '../assets/images/loan-art.png';
import investScene from '../assets/images/invest-backdrop.png';

/**
 * Public product pages. Every figure here matches what the API actually
 * enforces, so the marketing copy cannot drift from the product.
 */
export const PRODUCTS = {
  accounts: {
    route: ROUTES.accounts,
    eyebrow: 'Savings Account',
    title: 'Banking that starts with a better',
    highlight: 'account',
    blurb:
      'Open a Neuron Bank savings account in minutes, then send, receive and track every rupee from one dashboard.',
    art: accountArt,
    artAlt: 'The Neuron Bank dashboard showing balance, spending and recent activity.',
    features: [
      {
        icon: Wallet,
        title: 'Your account number in minutes',
        body: 'Apply online and get an account number as soon as an admin approves you.',
      },
      {
        icon: ArrowLeftRight,
        title: 'Transfers to saved payees',
        body: 'Money only moves to beneficiaries you have verified, so a typo cannot send it astray.',
      },
      {
        icon: ChartNoAxesColumn,
        title: 'Spending you can actually read',
        body: 'Monthly income and expenses, charted from your real transactions.',
      },
    ],
    stats: [
      { value: '₹0', label: 'Minimum balance' },
      { value: '2 min', label: 'To apply' },
      { value: '24/7', label: 'Access' },
    ],
  },

  cards: {
    route: ROUTES.cards,
    eyebrow: 'Debit Card',
    title: 'A debit card that works as hard as',
    highlight: 'you do',
    blurb:
      'Tap to pay anywhere, set your own daily limit, and freeze the card the moment something looks wrong.',
    art: cardArt,
    artAlt: 'A Neuron Bank debit card.',
    features: [
      {
        icon: Snowflake,
        title: 'Freeze it in one tap',
        body: 'Lock and unlock your card yourself. No phone call, no waiting.',
      },
      {
        icon: Lock,
        title: 'Your own spending limit',
        body: 'Set a daily limit anywhere from ₹1,000 to ₹2,00,000 and change it whenever you like.',
      },
      {
        icon: ShieldCheck,
        title: 'Every change confirmed',
        body: 'Limits, PIN and freezes all need a code emailed to you before they take effect.',
      },
    ],
    stats: [
      { value: '₹25,000', label: 'Default daily limit' },
      { value: '4-digit', label: 'PIN you choose' },
      { value: '5 years', label: 'Card validity' },
    ],
  },

  loans: {
    route: ROUTES.loans,
    eyebrow: 'Loans',
    title: 'Loans priced to be',
    highlight: 'paid off',
    blurb:
      'See the EMI before you apply, then let repayments run themselves. No hidden spread, no surprise instalment.',
    art: loanArt,
    artAlt: 'Illustration of an interest rate backed by a security shield.',
    features: [
      {
        icon: Receipt,
        title: 'The EMI, before you commit',
        body: 'Pick an amount and we quote the real monthly instalment for every tenure.',
      },
      {
        icon: CalendarClock,
        title: 'Repayment that runs itself',
        body: 'EMIs are collected from your account on each due date, with progress you can track.',
      },
      {
        icon: BadgeCheck,
        title: 'One application at a time',
        body: 'We review a single request properly rather than letting applications pile up.',
      },
    ],
    stats: [
      { value: '11.50%', label: 'Rates from (p.a.)' },
      { value: '3–60', label: 'Months tenure' },
      { value: '₹1,000+', label: 'Loan amount' },
    ],
  },

  investments: {
    route: ROUTES.investments,
    eyebrow: 'Deposits',
    title: 'Grow your wealth with secure',
    highlight: 'deposits',
    blurb:
      'Lock in a Fixed Deposit or build the habit with a Recurring Deposit. Guaranteed returns, no market risk.',
    // A full scene, so the hero drops its separate illustration.
    scene: investScene,
    features: [
      {
        icon: TrendingUp,
        title: 'Fixed Deposit',
        body: 'Invest a lump sum from ₹1,000 and earn a guaranteed rate for the whole term.',
      },
      {
        icon: PiggyBank,
        title: 'Recurring Deposit',
        body: 'Start from ₹500 a month and let every instalment compound alongside the last.',
      },
      {
        icon: Timer,
        title: 'Your money is never stuck',
        body: 'Close early whenever you need to. You keep the interest earned, minus a 1% charge.',
      },
    ],
    stats: [
      { value: '7.40%', label: 'FD rates up to (p.a.)' },
      { value: '7.25%', label: 'RD rates up to (p.a.)' },
      { value: '3–60', label: 'Months tenure' },
    ],
  },
};

export const PRODUCT_CROSS_LINKS = [
  { key: 'accounts', label: 'Accounts', icon: Wallet },
  { key: 'cards', label: 'Debit Cards', icon: CreditCard },
  { key: 'loans', label: 'Loans', icon: Receipt },
  { key: 'investments', label: 'Investments', icon: Sparkles },
];
