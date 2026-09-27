import Hero from './sections/Hero/Hero';
import Features from './sections/Features/Features';
import Dashboard from './sections/Dashboard/Dashboard';
import Card from './sections/Card/Card';
import Cta from './sections/Cta/Cta';
import Everywhere from './sections/Everywhere/Everywhere';
import Security from './sections/Security/Security';
import Trust from './sections/Trust/Trust';

/**
 * Marketing homepage. Each band of the page is its own component under
 * `sections/`, so this file stays a readable table of contents.
 */
function Home() {
  return (
    <main>
      <Hero />
      <Features />
      <Security />
      <Dashboard />
      <Everywhere />
      <Card />
      <Trust />
      <Cta />
    </main>
  );
}

export default Home;
