import { useLocation } from 'react-router-dom';
import Navbar from './components/layout/Navbar/Navbar';
import Footer from './components/layout/Footer/Footer';
import AppRoutes from './routes/AppRoutes';
import { ROUTES } from './routes/paths';

/**
 * Routes that render their own full-page layout, including their own brand
 * lockup — the site chrome would duplicate it, so it is hidden there.
 */
const BARE_ROUTES = [ROUTES.login, ROUTES.register];

/**
 * App shell: chrome that persists across every route, wrapped around the
 * route outlet.
 */
function App() {
  const { pathname } = useLocation();
  // The dashboard brings its own sidebar and topbar.
  const showChrome =
    !BARE_ROUTES.includes(pathname) && !pathname.startsWith(ROUTES.dashboard);

  return (
    <>
      {showChrome && <Navbar />}
      <AppRoutes />
      {showChrome && <Footer />}
    </>
  );
}

export default App;
