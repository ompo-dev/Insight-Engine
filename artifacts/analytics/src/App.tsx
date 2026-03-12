import { Switch, Route, Router as WouterRouter } from "wouter";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";

import Projects from "@/pages/Projects";
import Overview from "@/pages/Overview";
import Events from "@/pages/Events";
import Sessions from "@/pages/Sessions";
import SessionDetail from "@/pages/SessionDetail";
import Funnels from "@/pages/Funnels";
import Experiments from "@/pages/Experiments";
import ExperimentDetail from "@/pages/ExperimentDetail";
import Logs from "@/pages/Logs";
import Requests from "@/pages/Requests";
import Datastore from "@/pages/Datastore";
import Dashboards from "@/pages/Dashboards";
import Customers from "@/pages/Customers";
import FeatureFlags from "@/pages/FeatureFlags";
import Insights from "@/pages/Insights";
import Revenue from "@/pages/Revenue";
import SaaSMetrics from "@/pages/SaaSMetrics";
import Settings from "@/pages/Settings";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Projects} />
      
      {/* Project Scoped Routes */}
      <Route path="/projects/:projectId/overview" component={Overview} />
      <Route path="/projects/:projectId/events" component={Events} />
      <Route path="/projects/:projectId/sessions" component={Sessions} />
      <Route path="/projects/:projectId/sessions/:sessionId" component={SessionDetail} />
      <Route path="/projects/:projectId/funnels" component={Funnels} />
      <Route path="/projects/:projectId/experiments" component={Experiments} />
      <Route path="/projects/:projectId/experiments/:experimentId" component={ExperimentDetail} />
      <Route path="/projects/:projectId/metrics" component={SaaSMetrics} />
      <Route path="/projects/:projectId/customers" component={Customers} />
      <Route path="/projects/:projectId/revenue" component={Revenue} />
      <Route path="/projects/:projectId/feature-flags" component={FeatureFlags} />
      <Route path="/projects/:projectId/insights" component={Insights} />
      <Route path="/projects/:projectId/logs" component={Logs} />
      <Route path="/projects/:projectId/requests" component={Requests} />
      <Route path="/projects/:projectId/datastore" component={Datastore} />
      <Route path="/projects/:projectId/dashboards" component={Dashboards} />
      <Route path="/projects/:projectId/settings" component={Settings} />
      
      {/* Catch-all redirect to overview if project ID is hit directly */}
      <Route path="/projects/:projectId">
        {params => {
          window.location.href = `/projects/${params.projectId}/overview`;
          return null;
        }}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <TooltipProvider>
      <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Router />
      </WouterRouter>
      <Toaster />
    </TooltipProvider>
  );
}

export default App;
