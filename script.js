let projectStructure = {
    type: "dir",
    children: {
        "index.html": {
            type: "file",
            content: '<!DOCTYPE html>\n<html>\n<head>\n    <meta charset="UTF-8">\n    <title>My Page</title>\n    <link rel="stylesheet" href="style.css">\n</head>\n<body>\n    <h1>Helo World</h1>\n    <p>Edit me!</p>\n    <button id="btn">Click me for test :D</button>\n    <script src="script.js"><\/script>\n</body>\n</html>',
            path: "/index.html"
        },
        "style.css": {
            type: "file",
            content: 'body {\n    font-family: sans-serif;\n    margin: 40px;\n    background: #f0f0f0;\n}\n\nh1 {\n    color: #0066cc;\n}',
            path: "/style.css"
        },
        "script.js": {
            type: "file",
            content: 'console.log("Script loaded");\n\ndocument.getElementById("btn")?.addEventListener("click", () => {\n    alert("Button clicked!");\n});',
            path: "/script.js"
        }
    }
};

let currentFileId = null;
let autoSaveEnabled = true;
let splitViewEnabled = false;
let saveTimeout = null;
let draggedItemPath = null;
let fileCounter = 1;

function getNodeByPath(path) {
    if (!path || path === "/") return projectStructure;
    const parts = path.split('/').filter(p => p);
    let current = projectStructure;
    for (let part of parts) {
        if (current.children && current.children[part]) {
            current = current.children[part];
        } else {
            return null;
        }
    }
    return current;
}

function getParentPath(path) {
    const parts = path.split('/').filter(p => p);
    parts.pop();
    return "/" + parts.join('/');
}

function moveNode(sourcePath, destPath) {
    if (sourcePath === destPath) return false;
    if (destPath.startsWith(sourcePath + "/")) return false;
    
    const sourceNode = getNodeByPath(sourcePath);
    if (!sourceNode) return false;
    
    const sourceParentPath = getParentPath(sourcePath);
    const sourceName = sourcePath.split('/').pop();
    const sourceParent = getNodeByPath(sourceParentPath);
    if (!sourceParent || !sourceParent.children) return false;
    
    const destParentPath = destPath === "/" ? "/" : destPath;
    let destParent = getNodeByPath(destParentPath);
    if (!destParent || destParent.type !== "dir") {
        const destDirPath = getParentPath(destPath);
        destParent = getNodeByPath(destDirPath);
        if (!destParent || destParent.type !== "dir") return false;
    }
    
    const destName = destPath === "/" ? sourceName : destPath.split('/').pop();
    
    if (destParent.children[destName]) return false;
    
    delete sourceParent.children[sourceName];
    destParent.children[destName] = sourceNode;
    
    function updatePath(node, newBasePath) {
        if (node.type === "file") {
            node.path = newBasePath;
        } else if (node.type === "dir") {
            for (let childName in node.children) {
                updatePath(node.children[childName], newBasePath + "/" + childName);
            }
        }
    }
    
    const newFilePath = (destPath === "/" ? "/" + sourceName : destPath + "/" + sourceName);
    updatePath(sourceNode, newFilePath);
    
    saveToStorage();
    renderFileTree();
    
    if (currentFileId === sourcePath) {
        currentFileId = newFilePath;
        const filename = sourceName;
        document.getElementById("editor-title").innerText = filename;
    }
    
    return true;
}

function loadFromStorage() {
    const saved = localStorage.getItem("qwfalcon_project");
    if (saved) {
        try {
            projectStructure = JSON.parse(saved);
            return true;
        } catch(e) {}
    }
    return false;
}

function saveToStorage() {
    localStorage.setItem("qwfalcon_project", JSON.stringify(projectStructure));
    document.getElementById("save-status").innerText = "Saved " + new Date().toLocaleTimeString();
}

function renderFileTree() {
    const container = document.getElementById("file-tree");
    container.innerHTML = "";
    
    function renderNode(node, currentPath, indent) {
        if (node.type === "file") {
            const fullPath = node.path;
            const div = document.createElement("div");
            div.className = "file-item" + (currentFileId === fullPath ? " active" : "");
            div.style.paddingLeft = (indent * 16 + 8) + "px";
            div.draggable = true;
            div.setAttribute("data-path", fullPath);
            div.innerHTML = `
                <img src="img/fileimg.png" class="file-icon" alt="file">
                <span class="file-name">${fullPath.split('/').pop()}</span>
            `;
            
            div.ondragstart = (e) => {
                draggedItemPath = fullPath;
                e.dataTransfer.setData("text/plain", fullPath);
                e.dataTransfer.effectAllowed = "move";
            };
            
            div.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                div.classList.add("drag-over");
            };
            
            div.ondragleave = () => div.classList.remove("drag-over");
            
            div.ondrop = (e) => {
                e.preventDefault();
                div.classList.remove("drag-over");
                if (draggedItemPath && draggedItemPath !== fullPath) {
                    moveNode(draggedItemPath, fullPath);
                    draggedItemPath = null;
                }
            };
            
            div.onclick = (e) => {
                e.stopPropagation();
                openFile(fullPath);
            };
            container.appendChild(div);
        } else if (node.type === "dir") {
            const fullPath = currentPath === "/" ? "/" + node.name : currentPath + "/" + node.name;
            const dirDiv = document.createElement("div");
            const dirHeader = document.createElement("div");
            dirHeader.className = "dir-item";
            dirHeader.style.paddingLeft = (indent * 16 + 8) + "px";
            dirHeader.draggable = true;
            dirHeader.setAttribute("data-path", fullPath);
            dirHeader.innerHTML = `
                <img src="img/folderimg.png" class="dir-icon" alt="folder">
                <span class="dir-name">${node.name}</span>
            `;
            
            dirHeader.ondragstart = (e) => {
                draggedItemPath = fullPath;
                e.dataTransfer.setData("text/plain", fullPath);
                e.dataTransfer.effectAllowed = "move";
            };
            
            dirHeader.ondragover = (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
                dirHeader.classList.add("drag-over");
            };
            
            dirHeader.ondragleave = () => dirHeader.classList.remove("drag-over");
            
            dirHeader.ondrop = (e) => {
                e.preventDefault();
                dirHeader.classList.remove("drag-over");
                if (draggedItemPath && draggedItemPath !== fullPath) {
                    moveNode(draggedItemPath, fullPath);
                    draggedItemPath = null;
                }
            };
            
            const childrenDiv = document.createElement("div");
            childrenDiv.className = "dir-children";
            
            dirHeader.onclick = (e) => {
                e.stopPropagation();
                childrenDiv.classList.toggle("open");
            };
            
            dirDiv.appendChild(dirHeader);
            dirDiv.appendChild(childrenDiv);
            container.appendChild(dirDiv);
            
            const sorted = Object.keys(node.children).sort();
            for (let childName of sorted) {
                const child = node.children[childName];
                child.name = childName;
                renderNode(child, fullPath, indent + 1);
            }
        }
    }
    
    for (let childName in projectStructure.children) {
        const child = projectStructure.children[childName];
        child.name = childName;
        renderNode(child, "", 0);
    }
}

function openFile(path) {
    const node = getNodeByPath(path);
    if (node && node.type === "file") {
        currentFileId = path;
        document.getElementById("code-editor").value = node.content;
        const filename = path.split('/').pop();
        document.getElementById("editor-title").innerText = filename;
        const ext = filename.split('.').pop().toUpperCase();
        document.getElementById("editor-type").innerText = ext;
        renderFileTree();
        if (splitViewEnabled) updatePreview();
        document.getElementById("status-text").innerText = "Opened: " + filename;
    }
}

function saveCurrentFile() {
    if (!currentFileId) return;
    const content = document.getElementById("code-editor").value;
    const node = getNodeByPath(currentFileId);
    if (node && node.type === "file") {
        node.content = content;
        saveToStorage();
        document.getElementById("status-text").innerText = "Saved: " + currentFileId.split('/').pop();
        if (splitViewEnabled) updatePreview();
    }
}

function createNewFile() {
    let name = prompt("File name (with extension):", "page" + fileCounter + ".html");
    if (!name) return;
    if (!name.includes('.')) name += '.html';
    fileCounter++;
    
    if (projectStructure.children[name]) {
        alert("File already exists");
        return;
    }
    
    let content = "";
    const ext = name.split('.').pop();
    if (ext === "html") content = "<!DOCTYPE html>\n<html>\n<head>\n    <title>New Page</title>\n</head>\n<body>\n    <h1>New Page</h1>\n</body>\n</html>";
    else if (ext === "css") content = "/* Styles */\n\nbody {\n    margin: 0;\n    padding: 20px;\n}";
    else if (ext === "js") content = "// JavaScript\n\nconsole.log('Script loaded');";
    else content = "";
    
    projectStructure.children[name] = {
        type: "file",
        content: content,
        path: "/" + name
    };
    
    saveToStorage();
    renderFileTree();
    openFile("/" + name);
}

function createNewDirectory() {
    let name = prompt("Directory name:", "newfolder");
    if (!name) return;
    if (projectStructure.children[name]) {
        alert("Already exists");
        return;
    }
    projectStructure.children[name] = {
        type: "dir",
        children: {},
        name: name
    };
    saveToStorage();
    renderFileTree();
}

function uploadFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                let name = file.name;
                let counter = 1;
                while (projectStructure.children[name]) {
                    const parts = file.name.split('.');
                    const ext = parts.pop();
                    name = parts.join('.') + "_" + counter + "." + ext;
                    counter++;
                }
                projectStructure.children[name] = {
                    type: "file",
                    content: ev.target.result,
                    path: "/" + name
                };
                saveToStorage();
                renderFileTree();
                document.getElementById("status-text").innerText = "Uploaded: " + name;
            };
            reader.readAsText(file);
        }
    };
    input.click();
}

function updatePreview() {
    if (!splitViewEnabled) return;
    const frame = document.getElementById("preview-frame");
    if (!frame) return;
    
    let htmlContent = "";
    if (currentFileId && currentFileId.endsWith(".html")) {
        const node = getNodeByPath(currentFileId);
        if (node && node.content) htmlContent = transformHtmlWithVirtualPaths(node.content);
    }
    
    frame.srcdoc = htmlContent;
}

function getMimeType(filename) {
    const ext = filename.split('.').pop().toLowerCase();
    const types = {
        'css': 'text/css',
        'js': 'application/javascript',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'jpeg': 'image/jpeg',
        'gif': 'image/gif',
        'svg': 'image/svg+xml',
        'json': 'application/json',
        'html': 'text/html',
        'htm': 'text/html'
    };
    return types[ext] || 'text/plain';
}

function transformHtmlWithVirtualPaths(html) {
    let transformed = html;
    const assetRegex = /(href|src)=["']([^"']+)["']/g;
    transformed = transformed.replace(assetRegex, (match, attr, url) => {
        if (url.startsWith("http") || url.startsWith("//") || url.startsWith("#") || url.startsWith("data:")) return match;
        
        let cleanUrl = url.split('?')[0].split('#')[0];
        if (cleanUrl.startsWith("/")) cleanUrl = cleanUrl.substring(1);
        
        const fileNode = projectStructure.children[cleanUrl];
        if (fileNode && fileNode.type === "file") {
            const blob = new Blob([fileNode.content], { type: getMimeType(cleanUrl) });
            const blobUrl = URL.createObjectURL(blob);
            setTimeout(() => URL.revokeObjectURL(blobUrl), 10000);
            return `${attr}="${blobUrl}"`;
        }
        return match;
    });
    return transformed;
}

function runInBlobTab() {
    if (!currentFileId) {
        document.getElementById("status-text").innerText = "No file open to run";
        return;
    }
    
    const node = getNodeByPath(currentFileId);
    if (!node || node.type !== "file") {
        document.getElementById("status-text").innerText = "Current file is not runnable (not HTML)";
        return;
    }
    
    document.getElementById("status-text").innerText = "Generating blob URL...";
    
    try {
        let htmlContent = node.content;
        
        if (currentFileId.endsWith(".html")) {
            htmlContent = transformHtmlWithVirtualPaths(node.content);
        }
        
        const blob = new Blob([htmlContent], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        const newTab = window.open(url, "_blank");
        
        if (!newTab) {
            document.getElementById("status-text").innerText = "Popup blocked. Allow popups for this site.";
            URL.revokeObjectURL(url);
            return;
        }
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
            document.getElementById("status-text").innerText = "Running in new tab";
        }, 5000);
    } catch (err) {
        document.getElementById("status-text").innerText = "Error: " + err.message;
        console.error(err);
    }
}

function downloadCurrentFile() {
    if (!currentFileId) return;
    const filename = currentFileId.split('/').pop();
    const node = getNodeByPath(currentFileId);
    if (node && node.content) {
        const blob = new Blob([node.content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        document.getElementById("status-text").innerText = "Downloaded: " + filename;
    }
}

async function exportAsZip() {
    const JSZip = window.JSZip;
    const zip = new JSZip();
    
    function addToZip(node, zipPath) {
        if (node.type === "file") {
            zip.file(zipPath, node.content);
        } else if (node.type === "dir") {
            for (let name in node.children) {
                addToZip(node.children[name], zipPath + "/" + name);
            }
        }
    }
    
    for (let name in projectStructure.children) {
        addToZip(projectStructure.children[name], name);
    }
    
    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, "qwfalcon_project.zip");
    document.getElementById("status-text").innerText = "Project exported as ZIP";
}

function importZip(file) {
    const JSZip = window.JSZip;
    const zip = new JSZip();
    zip.loadAsync(file).then(function(zipData) {
        const newStructure = {
            type: "dir",
            children: {}
        };
        
        const promises = [];
        zipData.forEach(function(relativePath, zipEntry) {
            if (!zipEntry.dir) {
                promises.push(zipEntry.async("string").then(content => {
                    const parts = relativePath.split('/');
                    let current = newStructure;
                    for (let i = 0; i < parts.length - 1; i++) {
                        if (!current.children[parts[i]]) {
                            current.children[parts[i]] = { type: "dir", children: {} };
                        }
                        current = current.children[parts[i]];
                    }
                    current.children[parts[parts.length - 1]] = {
                        type: "file",
                        content: content,
                        path: "/" + relativePath
                    };
                }));
            }
        });
        
        Promise.all(promises).then(() => {
            projectStructure = newStructure;
            saveToStorage();
            renderFileTree();
            const firstFile = Object.keys(projectStructure.children)[0];
            if (firstFile) openFile("/" + firstFile);
            document.getElementById("status-text").innerText = "Project imported successfully";
        });
    }).catch(() => {
        alert("Failed to import ZIP file");
    });
}

function resetAllData() {
    if (confirm("WARNING: This will delete all your files. Are you sure?")) {
        projectStructure = {
            type: "dir",
            children: {
                "index.html": {
                    type: "file",
                    content: '<!DOCTYPE html>\n<html>\n<head>\n    <meta charset="UTF-8">\n    <title>My Page</title>\n</head>\n<body>\n    <h1>Hello World</h1>\n</body>\n</html>',
                    path: "/index.html"
                },
                "style.css": {
                    type: "file",
                    content: 'body {\n    font-family: sans-serif;\n    margin: 40px;\n}',
                    path: "/style.css"
                },
                "script.js": {
                    type: "file",
                    content: 'console.log("Ready");',
                    path: "/script.js"
                }
            }
        };
        saveToStorage();
        renderFileTree();
        openFile("/index.html");
        document.getElementById("status-text").innerText = "Reset to default project";
    }
}

document.getElementById("run-blob-btn").onclick = runInBlobTab;
document.getElementById("save-current-btn").onclick = downloadCurrentFile;
document.getElementById("settings-btn").onclick = () => document.getElementById("settings-panel").classList.add("active");
document.getElementById("close-settings").onclick = () => document.getElementById("settings-panel").classList.remove("active");
document.getElementById("new-file-btn").onclick = createNewFile;
document.getElementById("new-dir-btn").onclick = createNewDirectory;
document.getElementById("upload-file-btn").onclick = uploadFile;
document.getElementById("split-view-toggle").onchange = (e) => {
    splitViewEnabled = e.target.checked;
    const container = document.getElementById("preview-container");
    if (splitViewEnabled) {
        container.classList.add("active");
        updatePreview();
    } else {
        container.classList.remove("active");
    }
};
document.getElementById("auto-save-toggle").onchange = (e) => autoSaveEnabled = e.target.checked;
document.getElementById("export-zip-btn").onclick = exportAsZip;
document.getElementById("import-zip-btn").onclick = () => document.getElementById("import-zip-input").click();
document.getElementById("import-zip-input").onchange = (e) => {
    if (e.target.files[0]) importZip(e.target.files[0]);
    e.target.value = "";
};
document.getElementById("reset-all-btn").onclick = resetAllData;

document.getElementById("code-editor").addEventListener("input", () => {
    if (autoSaveEnabled) {
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            saveCurrentFile();
            if (splitViewEnabled) updatePreview();
        }, 1000);
    }
});

if (!loadFromStorage()) {
    saveToStorage();
}
renderFileTree();

const firstFile = Object.keys(projectStructure.children)[0];
if (firstFile) openFile("/" + firstFile);

setInterval(() => {
    if (autoSaveEnabled && currentFileId) {
        saveCurrentFile();
    }
}, 1000);
