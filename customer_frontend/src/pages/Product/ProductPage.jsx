import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { PRODUCTS, PRODUCT_CROSS_LINKS } from '../../constants/products';
import { ROUTES } from '../../routes/paths';
import cx from '../../utils/classNames';
import styles from './ProductPage.module.css';

/** One template, four products — the copy lives in constants/products.js. */
function ProductPage({ product }) {
  const config = PRODUCTS[product];

  const heroCopy = (
    <div className={styles.heroCopy}>
      <p className={styles.eyebrow}>
        <span className={styles.eyebrowDot} aria-hidden="true" />
        {config.eyebrow}
      </p>

      <h1 className={styles.title}>
        {config.title} <span className="u-gradient-text">{config.highlight}</span>
      </h1>

      <p className={styles.blurb}>{config.blurb}</p>

      <div className={styles.actions}>
        <Link to={ROUTES.register} className={styles.primary}>
          Open an account
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
        <Link to={ROUTES.login} className={styles.ghost}>
          I already bank here
        </Link>
      </div>

      <ul className={styles.stats}>
        {config.stats.map((stat) => (
          <li key={stat.label} className={styles.stat}>
            <strong>{stat.value}</strong>
            <span>{stat.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <main className={styles.page}>
      {/* A scene hero sits outside the padded container so it runs edge to
          edge and flush under the navbar. */}
      {config.scene ? (
        <section className={styles.heroScene}>
          <div
            className={styles.scene}
            style={{ backgroundImage: `url(${config.scene})` }}
            aria-hidden="true"
          />
          <div className={styles.sceneInner}>{heroCopy}</div>
        </section>
      ) : (
        <div className={styles.backdrop} aria-hidden="true" />
      )}

      <div className={styles.container}>
        <div className={styles.glow} aria-hidden="true" />

        {!config.scene && (
          <section className={styles.hero}>
            {heroCopy}
            <img src={config.art} alt={config.artAlt} className={styles.heroArt} />
          </section>
        )}

        <section className={styles.features}>
          {config.features.map(({ icon: Icon, title, body }) => (
            <article key={title} className={styles.feature}>
              <span className={styles.featureIcon} aria-hidden="true">
                <Icon size={22} />
              </span>
              <h2 className={styles.featureTitle}>{title}</h2>
              <p className={styles.featureBody}>{body}</p>
            </article>
          ))}
        </section>

        <section className={styles.cta}>
          <h2 className={styles.ctaTitle}>Ready when you are</h2>
          <p className={styles.ctaText}>
            Apply in a few minutes. An admin reviews every application before the
            account goes live.
          </p>
          <Link to={ROUTES.register} className={cx(styles.primary)}>
            Get started
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </section>

        <nav className={styles.crossLinks} aria-label="Other products">
          {PRODUCT_CROSS_LINKS.filter((item) => item.key !== product).map(
            ({ key, label, icon: Icon }) => (
              <Link key={key} to={PRODUCTS[key].route} className={styles.crossLink}>
                <span className={styles.crossIcon} aria-hidden="true">
                  <Icon size={18} />
                </span>
                {label}
                <ArrowRight
                  size={15}
                  aria-hidden="true"
                  className={styles.crossArrow}
                />
              </Link>
            ),
          )}
        </nav>
      </div>
    </main>
  );
}

export default ProductPage;
