const fs = require('fs');
let code = fs.readFileSync('src/css/style.css', 'utf8');

// Strip out the previous duplicates of .boards-wrapper overrides
code = code.replace(/\/\* Overrides for Combat Board \*\/[\s\S]*?\/\* Overrides for Combat Modal Images \*\//, '/* Overrides for Combat Modal Images */');

const newOverrides = `
/* Overrides for Combat Board */
.boards-wrapper .card {
    width: 140px !important;
    height: 200px !important;
    min-height: 200px !important;
}

.board-slot-empty { 
    width: 140px !important; 
    height: 200px !important; 
}

.boards-wrapper .card-image-container {
    position: relative !important;
    height: 70px !important;
    border-radius: 4px;
    margin-bottom: 2px;
    z-index: 1 !important;
}

.boards-wrapper .card-image-container::before {
    display: none !important;
}

.boards-wrapper .card-stats {
    padding: 6px !important;
    gap: 4px !important;
    background: rgba(15, 23, 42, 0.9) !important;
    font-size: 0.85em;
}

.boards-wrapper .card-energy-container {
    padding: 4px !important;
    font-size: 0.95em !important;
}

.boards-wrapper .card-header {
    padding: 6px 4px 4px !important;
}
`;

code += newOverrides;

fs.writeFileSync('src/css/style.css', code, 'utf8');
console.log('Fixed CSS overrides successfully');
