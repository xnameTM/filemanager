import express from 'express';
import path from "path";
import bodyParser from "body-parser";
import hbs from 'express-handlebars';
import {__dirname} from "./utils.js";


/**
 * @enum Method { GET, POST, PUT, DELETE, PATCH }
 * @interface Page {endpoint: string, method: Method, handler: (req, res) => void}
 * @param port {Number}
 * @param pages {Page[]}
 * @param helpers {Object}
 */
export default async function bootstrap(port, helpers = {}, pages) {
    // tworzony jest nowy serwer
    const app = express();

    // ustawiamy body parser, aby móc odczytywać dane z formularzy
    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(bodyParser.json());

    // ustawiamy silnik szablonów
    app.set('views', path.join(__dirname, 'views'));
    app.engine('hbs', hbs({
        defaultLayout: 'main.hbs',
        helpers
    }));

    app.set('view engine', 'hbs');
    app.use(express.static(path.join(__dirname, 'public')));

    // ustawiamy routsy
    pages.forEach(page => {
        app[page.method.toLowerCase()](page.endpoint, page.handler);
    });

    // uruchamiamy serwer
    app.listen(port, () => {
        console.log(`Server is listening on port ${port}`);
    });
}