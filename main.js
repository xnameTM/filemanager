import bootstrap from "./src/server.js";
import {__dirname} from "./src/utils.js";
import path from 'path';
import fs from 'fs';
import {IncomingForm} from 'formidable';

// dodaj komentarze do kodu

// domyślny katalog do uploadu
const UPLOAD_DIR = path.join(__dirname, 'uploads');

// jeśli nie istnieje, stwórz go
if (!fs.existsSync(UPLOAD_DIR))
    fs.mkdirSync(UPLOAD_DIR);

const imageEffects = ['grayscale', 'invert', 'sepia']

// główna funkcja
async function main() {
    // port z env lub 3000
    const PORT = process.env.PORT || 3000;

    // uruchom serwer
    await bootstrap(PORT, {
        isImage: (ext) => ['png', 'jpg', 'jpeg'].includes(ext.slice(1))
    }, [
        { // endpoint do wyświetlania plików
            endpoint: '/',
            method: 'GET',
            handler: (req, res) => {
                // pobierz root z query stringa
                const root = req.query?.root || '/';
                // pobierz czy ma być tabela wyświetlana z query stringa
                const tabled = req.query?.tabled === 'true';

                // jeśli nie istnieje, wyświetl błąd
                if (!fs.existsSync(path.join(UPLOAD_DIR, root))) {
                    res.render('filemanager.hbs', {error: 'Directory not found'});
                    return;
                }

                // pobierz wszystkie pliki z katalogu i przekonwertuj na obiekt
                const files = fs.readdirSync(path.join(UPLOAD_DIR, root)).map(file => {
                    // pobierz statystyki pliku
                    const stats = fs.statSync(path.join(UPLOAD_DIR, root, file));

                    // funkcja pomocnicza do dodawania zera na początku
                    const padL = (nr, len = 2, chr = `0`) => `${nr}`.padStart(2, chr);

                    // funkcja pomocnicza do konwersji rozmiaru
                    const size = (size) => {
                        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
                        let i = 0;
                        while (size > 1024) {
                            size /= 1024;
                            i++;
                        }
                        return `${size.toFixed(2)} ${units[i]}`;
                    }

                    return {
                        name: file,
                        isDirectory: stats.isDirectory(),
                        size: size(stats.size),
                        extension: path.extname(file),
                        icon: (stats.isDirectory() ? 'folder' : ['png', 'jpg', 'jpeg', 'gif'].map(ext => `.${ext}`).includes(path.extname(file)) ? 'image' : 'document') + '-outline',
                        modified: `${padL(stats.mtime.getDate())}.${padL(stats.mtime.getMonth() + 1)}.${stats.mtime.getFullYear()} ${padL(stats.mtime.getHours())}:${padL(stats.mtime.getMinutes())}`,
                        href: stats.isDirectory() ? '/?root=' + encodeURIComponent(`${root}/${file}`.replace('//', '/')) : '/open?path=' + encodeURIComponent(path.join(root, file)),
                        delete: '/?root=' + encodeURIComponent(`${root}/${file}`.replace('//', '/')),
                        rename: `${root}/${file}`.replace('//', '/'),
                        editable: ['css', 'html', 'js', 'json', 'txt', 'xml'].includes(path.extname(file).slice(1)),
                        editHref: `/editor?root=${encodeURIComponent(`${root}/${file}`.replace('//', '/'))}`,
                        imageHref: `/image?root=${encodeURIComponent(`${root}/${file}`.replace('//', '/'))}`
                    };
                });

                const roots = [];

                // dodaj wszystkie foldery do ścieżki wyświetlanej w headerze
                root.split('/').filter(s => s !== '').forEach((s, ind, arr) => {
                    roots.push({
                        name: s,
                        href: '/?root=' + encodeURIComponent('/' + arr.filter((_, i) => i <= ind).join('/'))
                    });
                })

                // wyświetl widok
                res.render('filemanager.hbs', {
                    roots: roots,
                    root: `/?root=${encodeURIComponent(root)}`,
                    files: files.sort((a, b) => a.isDirectory && !b.isDirectory ? -1 : !a.isDirectory && b.isDirectory ? 1 : a.name.localeCompare(b.name)),
                    tabled: tabled
                });
            }
        },
        { // endpoint do otwierania plików
            endpoint: '/open',
            method: 'GET',
            handler: (req, res) => {
                // pobierz root z query stringa
                const root = req.query?.path;
                // ma niby przekazywać przeglądarce że ma otwierać pliki, a nie pobierać (nie działa chyba)

                // jeśli ścieżka nie istnieje, wyświetl błąd
                if (!root) {
                    res.render('filemanager.hbs', {error: 'Path not specified'});
                    return;
                }

                // jeśli nie ma pliku istnieje, wyświetl błąd
                if (!fs.existsSync(path.join(UPLOAD_DIR, root))) {
                    res.render('filemanager.hbs', {error: 'File not found'});
                    return;
                }

                res.sendFile(path.join(UPLOAD_DIR, root));
            }
        },
        { // endpoint do tworzenia folderu
            "endpoint": "/folder",
            "method": "POST",
            "handler": (req, res) => {
                // pobierz root z query stringa
                const root = req.query?.root || '/';

                // jeśli ścieżka nie istnieje, wyświetl błąd
                if (!fs.existsSync(path.join(UPLOAD_DIR, root))) {
                    res.render('filemanager.hbs', {error: 'Directory not found'});
                    return;
                }

                // jeśli nie podano nazwy, wyświetl błąd
                if (!req.body?.name) {
                    res.render('filemanager.hbs', {error: 'Name not specified'});
                    return;
                }

                const name = req.body.name;

                // jeśli folder już istnieje, wyświetl błąd
                if (fs.existsSync(path.join(UPLOAD_DIR, root, name))) {
                    res.render('filemanager.hbs', {error: 'Directory already exists'});
                    return;
                }

                // stwórz folder
                fs.mkdirSync(path.join(UPLOAD_DIR, root, name));

                // przekieruj na stronę główną
                res.redirect(`/?root=${root}`);
            }
        },
        { // endpoint do tworzenia pliku
            endpoint: '/file',
            method: 'POST',
            handler: (req, res) => {
                // pobierz root z query stringa
                const root = req.query?.root || '/';

                // jeśli ścieżka nie istnieje, wyświetl błąd
                if (!fs.existsSync(path.join(UPLOAD_DIR, root))) {
                    res.render('filemanager.hbs', {error: 'Directory not found'});
                    return;
                }

                // jeśli nie podano nazwy, wyświetl błąd
                if (!req.body?.name) {
                    res.render('filemanager.hbs', {error: 'Name not specified'});
                    return;
                }

                const name = req.body.name;

                // jeśli plik już istnieje, wyświetl błąd
                if (fs.existsSync(path.join(UPLOAD_DIR, root, name))) {
                    res.render('filemanager.hbs', {error: 'File already exists'});
                    return;
                }

                // stwórz pusty plik
                fs.writeFileSync(path.join(UPLOAD_DIR, root, name), '');

                // przekieruj na stronę główną
                res.redirect(`/?root=${root}`);
            }
        },
        { // endpoint do uploadu plików
            endpoint: '/upload',
            method: 'POST',
            handler: (req, res) => {
                // pobierz root z query stringa
                const root = req.query?.root || '/';

                // jeśli ścieżka nie istnieje, wyświetl błąd
                if (!fs.existsSync(path.join(UPLOAD_DIR, root))) {
                    res.render('filemanager.hbs', {error: 'Directory not found'});
                    return;
                }

                // stwórz formularz
                const form = new IncomingForm({
                    allowEmptyFiles: true,
                    multiples: true,
                    minFileSize: 0,
                });

                // przetwórz formularz
                form.parse(req, (err, fields, files) => {
                    if (err)
                        console.log(err);

                    // skopiowane z filemanager1 (przekazuje pliki do uploadu)
                    (Array.isArray(files?.file) ? files?.file : []).forEach(file => {
                        const oldPath = file.filepath;

                        // jeśli plik już istnieje, dodaj _ na początku
                        while (fs.existsSync(path.join(UPLOAD_DIR, root, file.originalFilename)))
                            file.originalFilename = '_' + file.originalFilename;

                        // nowa ścieżka
                        const newPath = path.join(UPLOAD_DIR, root, file.originalFilename);
                        // odczytaj plik
                        const rawData = fs.readFileSync(oldPath);

                        // zapisz plik
                        fs.writeFile(newPath, Buffer.from(Buffer.from(rawData).toString('base64'), 'base64'), err => {
                            if (err) console.log(err);

                            fs.unlinkSync(oldPath);
                        });
                    });
                }).finally(() => {
                    res.redirect(`/?root=${root}`);
                });
            }
        },
        { // endpoint do usuwania plików
            endpoint: '/delete',
            method: 'POST',
            handler: (req, res) => {
                // pobierz root z query stringa
                const root = req.query?.root || '/';

                // jeśli ścieżka nie istnieje, wyświetl błąd
                if (!fs.existsSync(path.join(UPLOAD_DIR, root))) {
                    res.render('filemanager.hbs', {error: 'Directory not found'});
                    return;
                }

                // jeśli plik nie istnieje, wyświetl błąd
                if (!fs.existsSync(path.join(UPLOAD_DIR, root))) {
                    res.render('filemanager.hbs', {error: 'File not found'});
                    return;
                }

                // pobierz statystyki pliku
                const stats = fs.statSync(path.join(UPLOAD_DIR, root));

                // usuń plik lub folder
                if (stats.isDirectory())
                    // usuń folder rekurencyjnie
                    fs.rmdirSync(path.join(UPLOAD_DIR, root), {recursive: true});
                else

                    fs.unlinkSync(path.join(UPLOAD_DIR, root));

                res.redirect(`/?root=/`);
            }
        },
        {
            endpoint: '/rename',
            method: 'POST',
            handler: (req, res) => {
                const {root, path, name} = req.body;

                const oldPath = UPLOAD_DIR + path;
                const newPath = UPLOAD_DIR + path.replace(path.slice(path.lastIndexOf('/') + 1), name);

                // console.log(oldPath, newPath);

                if (!fs.existsSync(newPath)) {
                    fs.rename(oldPath, newPath, err => {
                        if (err)
                            res.render('filemanager.hbs', {error: 'Folder includes files. Please delete them first'});
                        else
                            res.redirect(root);
                    });
                } else {
                    res.render('filemanager.hbs', {error: 'Folder already exists'});
                }
            }
        },
        {
            endpoint: '/editor',
            method: 'GET',
            handler: (req, res) => {
                const root = req.query?.root;

                if (!root) {
                    res.render('filemanager.hbs', {error: 'Path not specified'});
                    return;
                }

                if (!fs.existsSync(path.join(UPLOAD_DIR, root))) {
                    res.render('filemanager.hbs', {error: 'Path does not exist'});
                    return;
                }

                if (!fs.statSync(path.join(UPLOAD_DIR, root)).isFile()) {
                    res.render('filemanager.hbs', {error: 'Path is not a file'});
                    return;
                }

                const roots = [];

                // dodaj wszystkie foldery do ścieżki wyświetlanej w headerze
                root.split('/').filter(s => s !== '').forEach((s, ind, arr) => {
                    roots.push({
                        name: s,
                        href: '/?root=' + encodeURIComponent('/' + arr.filter((_, i) => i <= ind).join('/'))
                    });
                })

                const content = fs.readFileSync(path.join(UPLOAD_DIR, root), 'utf8');

                res.render('editor.hbs', {
                    content,
                    roots,
                    root,
                    pathToFolder: root.slice(0, root.lastIndexOf('/') + 1),
                    filename: root.slice(root.lastIndexOf('/') + 1)
                });
            }
        },
        {
            endpoint: '/renameInEditor',
            method: 'POST',
            handler: (req, res) => {
                const {root, name, content} = req.body;

                // rename File and save content
                const oldPath = path.join(UPLOAD_DIR, root);
                const newPath = path.join(UPLOAD_DIR, root.replace(root.slice(root.lastIndexOf('/') + 1), name));

                if (oldPath === newPath) {
                    fs.writeFileSync(oldPath, content);
                    res.redirect(`editor?${new URLSearchParams({root: root.replace(root.slice(root.lastIndexOf('/') + 1), name)})}`);
                } else {
                    if (!fs.existsSync(newPath)) {
                        fs.rename(oldPath, newPath, err => {
                            if (err)
                                res.render('filemanager.hbs', {error: 'Folder includes files. Please delete them first'});
                            else
                                fs.writeFileSync(newPath, content);
                            res.redirect(`editor?${new URLSearchParams({root: root.replace(root.slice(root.lastIndexOf('/') + 1), name)})}`);
                        });
                    } else {
                        res.render('filemanager.hbs', {error: 'Path already exists'});
                    }
                }
            }
        },
        {
            endpoint: '/save',
            method: 'POST',
            handler: (req, res) => {
                const {root, content} = req.body;

                if (!root) {
                    res.render('filemanager.hbs', {error: 'Path not specified'});
                    return;
                }

                if (!fs.existsSync(path.join(UPLOAD_DIR, root))) {
                    res.render('filemanager.hbs', {error: 'Path does not exist'});
                    return;
                }

                if (!fs.statSync(path.join(UPLOAD_DIR, root)).isFile()) {
                    res.render('filemanager.hbs', {error: 'Path is not a file'});
                    return;
                }

                fs.writeFileSync(path.join(UPLOAD_DIR, root), content);

                res.redirect(`/?root=${root.slice(0, root.lastIndexOf('/'))}`);
            }
        },
        {
            endpoint: '/image',
            method: 'GET',
            handler: (req, res) => {
                const root = req.query?.root;

                if (!root) {
                    res.render('filemanager.hbs', {error: 'Path not specified'});
                    return;
                }

                if (!fs.existsSync(path.join(UPLOAD_DIR, root))) {
                    res.render('filemanager.hbs', {error: 'Path does not exist'});
                    return;
                }

                if (!['png', 'jpg', 'jpeg', 'gif'].map(ext => `.${ext}`).includes(path.extname(root))) {
                    res.render('filemanager.hbs', {error: 'Path is not an image'});
                    return;
                }

                if (!fs.statSync(path.join(UPLOAD_DIR, root)).isFile()) {
                    res.render('filemanager.hbs', {error: 'Path is not a file'});
                    return;
                }

                const roots = [];

                root.split('/').filter(s => s !== '').forEach((s, ind, arr) => {
                    roots.push({
                        name: s,
                        href: '/?root=' + encodeURIComponent('/' + arr.filter((_, i) => i <= ind).join('/'))
                    });
                });

                res.render('image.hbs', {
                    roots,
                    root,
                    src: `/open?path=${encodeURIComponent(root)}`,
                    effects: imageEffects,
                    filename: root.slice(root.lastIndexOf('/') + 1),
                    previewHref: `/open?path=${encodeURIComponent(root)}`
                });
            }
        },
        {
            endpoint: '/renameInImage',
            method: 'POST',
            handler: (req, res) => {
                const {root, name} = req.body;

                // rename File and save content
                const oldPath = path.join(UPLOAD_DIR, root);
                const newPath = path.join(UPLOAD_DIR, root.replace(root.slice(root.lastIndexOf('/') + 1), name));

                if (oldPath === newPath) {
                    res.redirect(`image?${new URLSearchParams({root: root.replace(root.slice(root.lastIndexOf('/') + 1), name)})}`);
                } else {
                    if (!fs.existsSync(newPath)) {
                        fs.rename(oldPath, newPath, err => {
                            if (err)
                                res.render('filemanager.hbs', {error: 'Folder includes files. Please delete them first'});
                            else
                                res.redirect(`image?${new URLSearchParams({root: root.replace(root.slice(root.lastIndexOf('/') + 1), name)})}`);
                        });
                    } else {
                        res.render('filemanager.hbs', {error: 'Path already exists'});
                    }
                }
            }
        },
        {
            endpoint: '/saveImage',
            method: 'POST',
            handler: (req, res) => {
                const {root, dataUrl} = req.body;

                if (!root) {
                    res.render('filemanager.hbs', {error: 'Path not specified'});
                    return;
                }

                if (!fs.existsSync(path.join(UPLOAD_DIR, root))) {
                    res.render('filemanager.hbs', {error: 'Path does not exist'});
                    return;
                }

                res.header('Content-Type', 'application/json');

                try {
                    const buffer = Buffer.from(dataUrl, 'base64');
                    fs.writeFileSync(path.join(UPLOAD_DIR, root), buffer);
                    res.send({success: true});
                } catch (error) {
                    res.send({success: false, error});
                }
            }
        }
    ]);
}

main();