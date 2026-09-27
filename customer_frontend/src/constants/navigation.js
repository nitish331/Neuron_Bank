import { ROUTES } from '../routes/paths';

/**
 * Footer link columns.
 *
 * Only the routes already in ROUTES resolve to a real screen; the rest are
 * placeholders that fall through to NotFound until those pages are built.
 */
export const FOOTER_NAV = [
  {
    heading: 'Products',
    links: [
      { label: 'Accounts', to: ROUTES.accounts },
      { label: 'Cards', to: ROUTES.cards },
      { label: 'Loans', to: ROUTES.loans },
      { label: 'Investments', to: ROUTES.investments },
    ],
  },
  {
    heading: 'Company',
    links: [
      { label: 'About Us', to: '/about' },
      { label: 'Careers', to: '/careers' },
      { label: 'Blog', to: '/blog' },
      { label: 'Press', to: '/press' },
    ],
  },
  {
    heading: 'Support',
    links: [
      { label: 'Help Center', to: ROUTES.support },
      { label: 'Contact Us', to: '/contact' },
      { label: 'FAQ', to: '/faq' },
      { label: 'Security', to: '/security' },
    ],
  },
  {
    heading: 'Legal',
    links: [
      { label: 'Privacy Policy', to: '/privacy' },
      { label: 'Terms & Conditions', to: '/terms' },
      { label: 'Cookie Policy', to: '/cookies' },
      { label: 'Responsible Disclosure', to: '/disclosure' },
    ],
  },
];

/**
 * Primary links in the marketing header.
 *
 * An item has EITHER `sectionId` (scrolls to that section of the homepage) or
 * `to` (a normal route). Labels are named after the sections they actually
 * reach — there is no Accounts or Loans section to scroll to yet, so those
 * links live in the footer until real pages exist.
 */
export const PRIMARY_NAV = [
  { label: 'Home', sectionId: 'top' },
  { label: 'Features', sectionId: 'features' },
  { label: 'Dashboard', sectionId: 'dashboard' },
  { label: 'Cards', sectionId: 'cards' },
  { label: 'Investments', to: ROUTES.investments },
  { label: 'Support', to: ROUTES.support },
];
