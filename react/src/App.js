import {
    HashRouter as Router,
    Route, Switch
} from "react-router-dom";


import './App.css';
import Header from './components/Header'
import NotesListPage from './pages/NotesListPage'
import NotePage from './pages/NotePage'
import ArangoDBPage from './pages/ArangoDBPage'
import CLList from "./pages/CLList";
import CellPage from "./pages/CellPage";

function App() {
  return (
    <Router>
      <Header />
      <div className="container">
        <div className="app">
            <Switch>
                <Route path="/:coll/:id" component={CellPage} />
                <Route path="/:coll" component={CLList} />
            </Switch>
        </div>
      </div>
    </Router>
  );
}

export default App;
