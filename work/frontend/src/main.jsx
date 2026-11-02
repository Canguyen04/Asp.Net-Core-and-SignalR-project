import React from 'react';
import ReactDOM from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';
import App from './App.jsx';

// JWT attachment and 401 handling are centralized in src/api.js.
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><BrowserRouter><App/></BrowserRouter></React.StrictMode>
);
