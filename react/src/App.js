import {
  HashRouter as Router,
  Route
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
      <div className="container dark">
        <div className="app">
          <Header />
          <Route path="/cl" component={CLList} />
          <Route path="/cell/:id" component={CellPage} />
          {/*<Route path="/notes" exact component={NotesListPage} />*/}
          {/*<Route path="/note/:id" component={NotePage} />*/}
          {/*<Route path="/arango" component={ArangoDBPage} />*/}
        </div>
      </div>
    </Router>
  );
}

export default App;
