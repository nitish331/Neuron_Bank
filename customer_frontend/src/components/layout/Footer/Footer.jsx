import { Link } from 'react-router-dom';
import Container from '../../common/Container/Container';
import Logo from '../../common/Logo/Logo';
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  LockIcon,
  TwitterIcon,
} from '../../common/Icon/Icon';
import { FOOTER_NAV } from '../../../constants/navigation';
import styles from './Footer.module.css';

const SOCIALS = [
  { label: 'Facebook', icon: FacebookIcon, href: 'https://facebook.com' },
  { label: 'Instagram', icon: InstagramIcon, href: 'https://instagram.com' },
  { label: 'Twitter', icon: TwitterIcon, href: 'https://twitter.com' },
  { label: 'LinkedIn', icon: LinkedinIcon, href: 'https://linkedin.com' },
];

function Footer() {
  return (
    <footer className={styles.footer}>
      <Container>
        <div className={styles.footerMain}>
          <div className={styles.footerBrand}>
            <Logo variant="horizontal" />
            <p>Smarter banking for a smarter you.</p>
          </div>

          <nav className={styles.footerNav} aria-label="Footer">
            {FOOTER_NAV.map((column) => (
              <div key={column.heading} className={styles.footerColumn}>
                <h2 className={styles.footerHeading}>{column.heading}</h2>
                <ul>
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link to={link.to}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>

          <div className={styles.footerSocial}>
            <h2 className={styles.footerHeading}>Follow Us</h2>
            <ul>
              {SOCIALS.map(({ label, icon: Icon, href }) => (
                <li key={label}>
                  <a
                    href={href}
                    aria-label={label}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <Icon />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.footerBottom}>
          <p>
            &copy; {new Date().getFullYear()} Neuron Bank. All rights reserved.
          </p>
          <p className={styles.footerAssurance}>
            <LockIcon />
            Your money is safe with us
            <span>256-bit SSL Encryption</span>
          </p>
        </div>
      </Container>
    </footer>
  );
}

export default Footer;
