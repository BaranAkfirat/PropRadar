const fs = require('fs');
const path = require('path');
const { app } = require('electron');

class DataStore {
    constructor(fileName = 'prop_radar_ilanlar.json') {
        this.dataFilePath = path.join(app.getPath('userData'), fileName);
    }

    loadData() {
        try {
            if (fs.existsSync(this.dataFilePath)) {
                const rawData = fs.readFileSync(this.dataFilePath, 'utf-8');
                return JSON.parse(rawData);
            }
        } catch (error) {
            console.error("Veri okuma hatası:", error);
        }
        return [];
    }

    saveData(data) {
        try {
            fs.writeFileSync(this.dataFilePath, JSON.stringify(data, null, 2));
            return true;
        } catch (error) {
            console.error("Veri kaydetme hatası:", error);
            return false;
        }
    }
}

module.exports = new DataStore();