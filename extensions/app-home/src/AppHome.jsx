import {render} from 'preact';
import {LocationProvider, ErrorBoundary, Router, Route} from 'preact-iso';

import InboxPage from './pages/InboxPage.jsx';
import TaskPage from './pages/TaskPage.jsx';
import WeeklyReviewPage from './pages/WeeklyReviewPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

export default async () => {
  render(<App />, document.body);
};

function App() {
  return (
    <LocationProvider>
      <s-app-nav>
        <s-link href="/">Stock tasks</s-link>
        <s-link href="/weekly-review">Weekly review</s-link>
        <s-link href="/settings">Settings</s-link>
      </s-app-nav>
      <ErrorBoundary>
        <Router>
          <Route path="/" component={InboxPage} />
          <Route path="/task/:id" component={TaskPage} />
          <Route path="/weekly-review" component={WeeklyReviewPage} />
          <Route path="/settings" component={SettingsPage} />
          <Route default component={NotFoundPage} />
        </Router>
      </ErrorBoundary>
    </LocationProvider>
  );
}
