import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const drawDPRPage = (doc, data, photos = []) => {
    const m = 15;
    let y = 20;

    doc.setFontSize(22).setTextColor(0, 86, 179).setFont('helvetica', 'bold');
    doc.text("Daily Progress Report", 105, 20, { align: 'center' });

    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(m, 28, 195, 28);
    y = 40;

    if (!data) {
        doc.setFontSize(14).setTextColor(255, 0, 0);
        doc.text("Error: Missing Report Data", m, y);
        return;
    }

    // Safe Parser
    const safeData = (arr, defaultValue = []) => {
        if (!arr) return defaultValue;
        if (Array.isArray(arr)) return arr;
        try {
            const parsed = JSON.parse(arr);
            return Array.isArray(parsed) ? parsed : defaultValue;
        } catch { return defaultValue; }
    };
    const safeObj = (obj, defaultValue = {}) => {
        if (!obj) return defaultValue;
        if (typeof obj === 'object') return obj;
        try {
            return JSON.parse(obj) || defaultValue;
        } catch { return defaultValue; }
    };

    // Parse main sections
    const manpower = safeData(data.manpower);
    const workStarted = safeData(data.workStarted);
    const equipment = safeData(data.equipment);
    const materials = safeData(data.materials);
    const work = safeData(data.work);
    const reconciliation = safeData(data.reconciliation);
    const remarks = safeObj(data.remarks, { hindrances: '', safety: '' });
    const signatures = safeObj(data.signatures, { prepared: '', reviewed: '', approved: '' });
    const projectInfo = safeObj(data.projectInfo, {
        projectName: '', location: '', dprNo: '', date: '', weather: '', temp: ''
    });

    // Sanitize Photos and check fallback
    let safePhotos = safeData(photos);
    if (safePhotos.length === 0 && data.photos) {
        safePhotos = safeData(data.photos);
    }



    // Project Info
    // Strip emojis/non-standard chars from weather to prevent PDF errors
    const cleanWeather = (projectInfo.weather || '').replace(/[^\x00-\x7F]/g, "").trim();

    const infoBody = [
        ['Project', projectInfo.projectName, 'Location', projectInfo.location],
        ['DPR No', projectInfo.dprNo, 'Date', projectInfo.date],
        ['Weather', cleanWeather, 'Temp', projectInfo.temp ? `${projectInfo.temp}°C` : '']
    ];

    autoTable(doc, {
        body: infoBody,
        startY: y,
        theme: 'grid',
        styles: { cellPadding: 2, fontSize: 10, textColor: 50 },
        columnStyles: {
            0: { fontStyle: 'bold', cellWidth: 25, textColor: 0 },
            2: { fontStyle: 'bold', cellWidth: 25, textColor: 0 }
        }
    });
    y = doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : y + 30;

    // Helper for Tables
    const printTable = (title, head, bodyData) => {
        if (bodyData.length === 0) return;

        // Check if page break needed
        if (y > 250) { doc.addPage(); y = 20; }

        doc.setFontSize(12).setTextColor(0, 86, 179).setFont('helvetica', 'bold');
        doc.text(title, m, y);

        autoTable(doc, {
            startY: y + 4,
            head: [head],
            body: bodyData,
            theme: 'grid',
            headStyles: { fillColor: [0, 86, 179], fontSize: 9, fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3, lineColor: 220 },
            margin: { left: m, right: m }
        });
        y = doc.lastAutoTable.finalY + 10;
    };

    // Manpower
    const mpBody = manpower.map(r => {
        const skilled = Number(r.skilled) || 0;
        const unskilled = Number(r.unskilled) || 0;
        const total = r.total || (skilled + unskilled);
        return [r.trade, skilled, unskilled, total, r.note];
    });
    printTable('Manpower', ['Trade', 'Skilled', 'Unskilled', 'Total', 'Note'], mpBody);

    // Work Started (New)
    if (workStarted.length > 0) {
        const wsBody = workStarted.map(r => [r.description, r.location, r.note]);
        printTable('Work Started Today', ['Description', 'Location', 'Note'], wsBody);
    }

    // Equipment
    const eqBody = equipment.map(r => [r.name, r.qty, r.hrs, r.status]);
    printTable('Equipment', ['Name', 'Qty', 'Hrs', 'Status'], eqBody);

    // Materials
    const matBody = materials.map(r => [r.type, r.name, r.unit, r.qty, r.supplier]);
    printTable('Materials Received', ['Type', 'Name', 'Unit', 'Qty', 'Supplier'], matBody);

    // Work
    const wkBody = work.map(r => [r.desc, r.grid, r.qty, r.unit, r.status]);
    printTable('Work Progress', ['Desc', 'Grid', 'Qty', 'Unit', 'Status'], wkBody);

    // Reconciliation
    const rcBody = reconciliation.map(r => [r.item, r.unit, r.theory, r.actual, r.diff, r.note]);
    printTable('Quantity Reconciliation', ['Item', 'Unit', 'Theory', 'Actual', 'Diff', 'Note'], rcBody);

    // Plan for Tomorrow (New)
    if (data.planTomorrow) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(12).setTextColor(0, 86, 179).setFont('helvetica', 'bold');
        doc.text("Plan for Tomorrow:", m, y + 5);
        doc.setFontSize(10).setTextColor(50).setFont('helvetica', 'normal');
        const splitPlan = doc.splitTextToSize(data.planTomorrow, 180);
        doc.text(splitPlan, m, y + 12);
        y += (splitPlan.length * 5) + 15;
    }

    // Remarks
    if (remarks.hindrances || remarks.safety) {
        if (y > 240) { doc.addPage(); y = 20; }
        doc.setFontSize(11).setTextColor(220, 38, 38).setFont('helvetica', 'bold');
        doc.text("Remarks / Issues:", m, y + 5);
        doc.setFontSize(10).setTextColor(50).setFont('helvetica', 'normal');

        const splitHind = doc.splitTextToSize(`Hindrances: ${remarks.hindrances}`, 180);
        doc.text(splitHind, m, y + 12);
        y += (splitHind.length * 5) + 5;

        const splitSafe = doc.splitTextToSize(`Safety: ${remarks.safety}`, 180);
        doc.text(splitSafe, m, y + 5);
        y += (splitSafe.length * 5) + 10;
    }

    // Photos
    if (safePhotos.length > 0) {
        if (y > 200) { doc.addPage(); y = 20; }
        doc.setFontSize(12).setTextColor(0, 86, 179).setFont('helvetica', 'bold');
        doc.text("Site Photos", m, y);
        y += 10;

        let x = m;
        safePhotos.forEach((img) => {
            if (x > 130) { x = m; y += 60; }
            if (y > 240) { doc.addPage(); y = 20; x = m; }
            try {
                // Auto-detect format (pass undefined/null as second arg)
                doc.addImage(img, undefined, x, y, 50, 50);
                x += 60;
            } catch (e) {
                console.error("Image add error:", e);
                // Try fallback to JPEG if auto-detect fails
                try {
                    doc.addImage(img, 'JPEG', x, y, 50, 50);
                } catch (e2) { console.error("Retry JPEG failed:", e2); }
            }
        });
        y += 60;
    }

    // Signatures
    if (y > 250) { doc.addPage(); y = 20; }
    autoTable(doc, {
        startY: y + 10,
        head: [['Prepared By', 'Reviewed By', 'Approved By']],
        body: [[signatures.prepared, signatures.reviewed, signatures.approved]],
        theme: 'plain',
        styles: { halign: 'center', valign: 'bottom', minCellHeight: 25, fontSize: 10 },
        headStyles: { fontStyle: 'normal', textColor: 100 }
    });
};

export const generateDPRPDF = (data, photos = [], type = 'save') => {
    try {
        const doc = new jsPDF();
        drawDPRPage(doc, data, photos);

        if (type === 'view') {
            window.open(doc.output('bloburl'), '_blank');
        } else {
            const filename = `${data.projectInfo.dprNo}_${data.projectInfo.projectName || 'Project'}.pdf`;
            doc.save(filename);
        }
        return true;
    } catch (err) {
        console.error("PDF Generation Error:", err);
        alert("Error generating PDF: " + err.message);
        return false;
    }
};

export const generateDetailedHistoryPDF = (historyData) => {
    try {
        const doc = new jsPDF();

        historyData.forEach((item, index) => {
            if (index > 0) doc.addPage();
            drawDPRPage(doc, item.data, item.photos || []);
        });

        doc.save('DPR_History_Full_Compilation.pdf');
        return true;
    } catch (err) {
        console.error("History PDF Error:", err);
        alert("Error generating history PDF");
        return false;
    }
};

export const generateEstimationPDF = (estimation, items, customShapes = [], barShapes = {}) => {
    try {
        const doc = new jsPDF();
        const m = 15;
        let y = 20;

        // Title
        doc.setFontSize(22).setTextColor(0, 86, 179).setFont('helvetica', 'bold');
        doc.text(estimation.title || "Estimation", 105, y, { align: 'center' });
        y += 10;
        doc.setFontSize(12).setTextColor(100).setFont('helvetica', 'normal');
        doc.text(`${estimation.type.toUpperCase()} Estimation - ${new Date().toLocaleDateString()}`, 105, y, { align: 'center' });

        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(m, y + 5, 195, y + 5);
        y += 15;

        const tableColumn = [];
        const tableRows = [];

        if (estimation.type === 'steel') {
            tableColumn.push('Mark', 'Description', 'Shape', 'Dia', 'Spacing', 'No. Mem', 'Bars/Mem', 'Total Bars', 'Cut Len (m)', 'Total Len (m)', 'Total Wt (kg)');
            items.forEach(item => {
                let shapeName = item.shape;
                // Resolve Shape Name
                if (barShapes[item.shape]) {
                    shapeName = barShapes[item.shape].name;
                } else {
                    const custom = customShapes.find(s => String(s.id) === String(item.shape) || String(s._id) === String(item.shape));
                    if (custom) {
                        shapeName = custom.name;
                    } else if (item.shape && item.shape.length > 10) {
                        // Fallback for missing/deleted custom shapes
                        shapeName = "Custom Shape";
                    }
                }

                tableRows.push([
                    item.barMark,
                    item.description,
                    shapeName,
                    item.dia,
                    item.spacing,
                    item.noMembers,
                    item.barsPerMember,
                    (parseFloat(item.noMembers) || 0) * (parseFloat(item.barsPerMember) || 0),
                    parseFloat(item.cuttingLength).toFixed(3),
                    parseFloat(item.totalLength).toFixed(2),
                    parseFloat(item.totalWeight).toFixed(2)
                ]);
            });
        } else if (estimation.type === 'concrete') {
            tableColumn.push('Description', 'Shape', 'Dimensions', 'Count', 'Volume (m3)');
            items.forEach(item => {
                const dimsStr = item.dims ? Object.entries(item.dims).map(([k, v]) => `${k}=${v}`).join(', ') : '-';
                tableRows.push([
                    item.description,
                    item.shape,
                    dimsStr,
                    item.count,
                    item.quantity
                ]);
            });
        } else if (estimation.type === 'masonry') {
            tableColumn.push('Description', 'Material', 'Wall Dims', 'Deductions', 'Mortar', 'Count', 'Mortar Vol (m3)');
            items.forEach(item => {
                const dedStr = (item.deductions && item.deductions.length > 0)
                    ? item.deductions.map(d => `${d.name || 'Ded'}: ${d.l}x${d.h}m (${d.count})`).join('\n')
                    : '-';
                tableRows.push([
                    item.description,
                    item.material,
                    `${item.wallDims?.l}x${item.wallDims?.h}x${item.wallDims?.t}m`,
                    dedStr,
                    item.mortarRatio,
                    item.count,
                    item.mortarRatio === 'CHEMICAL' ? `${item.chemicalWeight?.toFixed(2)} kg` : item.mortar?.toFixed(3)
                ]);
            });
        } else if (estimation.type === 'plaster') {
            tableColumn.push('Description', 'Dims', 'Deductions', 'Thk (mm)', 'Ratio', 'Area (m2)', 'Vol (m3)');
            items.forEach(item => {
                const dedStr = (item.deductions && item.deductions.length > 0)
                    ? item.deductions.map(d => `${d.name || 'Ded'}: ${d.l}x${d.h}m (${d.count})`).join('\n')
                    : '-';
                tableRows.push([
                    item.description,
                    item.manualArea ? `${item.manualArea} m2` : `${item.wallDims?.l}x${item.wallDims?.h}m`,
                    dedStr,
                    item.thickness,
                    item.ratio,
                    item.area?.toFixed(2),
                    item.volume?.toFixed(3)
                ]);
            });
        } else if (estimation.type === 'flooring') {
            tableColumn.push('Description', 'Room', 'Area (m2)', 'Tile', 'Count (Nos)', 'Wastage', 'Bedding', 'Ratio', 'Vol (m3)');
            items.forEach(item => {
                tableRows.push([
                    item.description,
                    `${item.roomDims?.l}x${item.roomDims?.w}m`,
                    item.area?.toFixed(2),
                    item.tileSize,
                    item.tileCount,
                    `${item.wastage}%`,
                    `${item.beddingThickness}mm`,
                    item.ratio,
                    item.volume?.toFixed(3)
                ]);
            });
        }

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: y,
            theme: 'grid',
            headStyles: { fillColor: [0, 86, 179] },
            styles: { fontSize: 9 }
        });

        // Summary
        y = doc.lastAutoTable.finalY + 15;

        doc.setFontSize(14).setTextColor(0).setFont('helvetica', 'bold');
        doc.text("Material Summary", m, y);
        y += 8;
        doc.setFontSize(11).setFont('helvetica', 'normal');

        if (estimation.type === 'steel') {
            const totalSteel = items.reduce((sum, item) => sum + (parseFloat(item.totalWeight) || 0), 0);
            doc.text(`Total Steel Weight: ${totalSteel.toFixed(2)} kg`, m, y);
            y += 6;
            doc.text(`Bending Wire: ${(totalSteel / 100).toFixed(2)} kg`, m, y);
            y += 6;
            doc.text(`Cover Blocks: ${Math.ceil((totalSteel / 100) * 3)} Nos`, m, y);

            // Weight Summary by Diameter
            y += 10;
            doc.setFontSize(12).setFont('helvetica', 'bold');
            doc.text("Weight Summary by Diameter", m, y);
            y += 6;

            const weightByDia = {};
            items.forEach(item => {
                const dia = item.dia;
                weightByDia[dia] = (weightByDia[dia] || 0) + (parseFloat(item.totalWeight) || 0);
            });

            const diaTableHead = [['Diameter (mm)', 'Total Weight (kg)']];
            const diaTableBody = Object.entries(weightByDia)
                .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                .map(([dia, wt]) => [`${dia} mm`, wt.toFixed(2)]);

            autoTable(doc, {
                head: diaTableHead,
                body: diaTableBody,
                startY: y,
                theme: 'striped',
                headStyles: { fillColor: [100, 116, 139] },
                styles: { fontSize: 10 },
                tableWidth: 100 // Compact table
            });

        } else if (estimation.type === 'concrete') {
            const totalVol = items.reduce((sum, item) => sum + (parseFloat(item.quantity) || 0), 0);
            doc.text(`Total Concrete Volume: ${totalVol.toFixed(3)} m3`, m, y);

            y += 8;
            const ratioStr = estimation.defaultConcreteRatio || '1:1.5:3';
            const parts = ratioStr.split(':').map(Number);
            if (parts.length === 3 && !parts.some(isNaN)) {
                const totalParts = parts[0] + parts[1] + parts[2];
                const dryVol = totalVol * 1.54;
                const cementBags = Math.ceil((dryVol * parts[0] / totalParts) / 0.035);
                const sandVol = (dryVol * parts[1] / totalParts).toFixed(2);
                const aggVol = (dryVol * parts[2] / totalParts).toFixed(2);

                doc.setFontSize(12).setFont('helvetica', 'bold');
                doc.text(`Material Requirement (Ratio: ${ratioStr})`, m, y);
                y += 6;
                doc.setFontSize(11).setFont('helvetica', 'normal');
                doc.text(`Total Cement: ${cementBags} Bags`, m, y);
                y += 6;
                doc.text(`Total Sand: ${sandVol} m3`, m, y);
                y += 6;
                doc.text(`Total Aggregate: ${aggVol} m3`, m, y);
            }
        }
        else if (estimation.type === 'masonry') {
            const totalCement = Math.ceil(items.reduce((sum, item) => {
                if (item.mortarRatio === 'CHEMICAL') return sum;
                const ratioParts = (item.mortarRatio || '1:6').split(':').map(Number);
                if (ratioParts.length !== 2) return sum;
                const totalParts = ratioParts[0] + ratioParts[1];
                const cementVol = (item.mortar || 0) * (ratioParts[0] / totalParts);
                return sum + (cementVol / 0.035);
            }, 0));

            const totalSand = items.reduce((sum, item) => {
                if (item.mortarRatio === 'CHEMICAL') return sum;
                const ratioParts = (item.mortarRatio || '1:6').split(':').map(Number);
                if (ratioParts.length !== 2) return sum;
                const totalParts = ratioParts[0] + ratioParts[1];
                const sandVol = (item.mortar || 0) * (ratioParts[1] / totalParts);
                return sum + sandVol;
            }, 0).toFixed(2);

            const totalChemical = Math.ceil(items.reduce((sum, item) => {
                return sum + (parseFloat(item.chemicalWeight) || 0);
            }, 0));

            y += 4;
            doc.setFontSize(12).setFont('helvetica', 'bold');
            doc.text("Material Requirement", m, y);
            y += 6;
            doc.setFontSize(11).setFont('helvetica', 'normal');
            doc.text(`Total Cement: ${totalCement} Bags`, m, y);
            y += 6;
            doc.text(`Total Sand: ${totalSand} m3`, m, y);
            if (totalChemical > 0) {
                y += 6;
                doc.text(`Total Chemical Adhesive: ${totalChemical} kg`, m, y);
            }
        } else if (estimation.type === 'plaster') {
            const totalCement = Math.ceil(items.reduce((sum, item) => {
                const ratioParts = (item.ratio || '1:4').split(':').map(Number);
                if (ratioParts.length !== 2) return sum;
                const totalParts = ratioParts[0] + ratioParts[1];
                const dryVol = (parseFloat(item.volume) || 0) * 1.33;
                const cementVol = dryVol * (ratioParts[0] / totalParts);
                return sum + (cementVol / 0.035);
            }, 0));

            const totalSand = items.reduce((sum, item) => {
                const ratioParts = (item.ratio || '1:4').split(':').map(Number);
                if (ratioParts.length !== 2) return sum;
                const totalParts = ratioParts[0] + ratioParts[1];
                const dryVol = (parseFloat(item.volume) || 0) * 1.33;
                return sum + (dryVol * (ratioParts[1] / totalParts));
            }, 0).toFixed(2);

            y += 4;
            doc.setFontSize(12).setFont('helvetica', 'bold');
            doc.text("Material Requirement", m, y);
            y += 6;
            doc.setFontSize(11).setFont('helvetica', 'normal');
            doc.text(`Total Cement: ${totalCement} Bags`, m, y);
            y += 6;
            doc.text(`Total Sand: ${totalSand} m3`, m, y);
        } else if (estimation.type === 'flooring') {
            const totalTiles = items.reduce((sum, item) => sum + (parseInt(item.tileCount) || 0), 0);
            const totalVol = items.reduce((sum, item) => sum + (parseFloat(item.volume) || 0), 0);

            const totalCement = Math.ceil(items.reduce((sum, item) => {
                if (item.ratio === 'CHEMICAL') return sum;
                const ratioParts = (item.ratio || '1:6').split(':').map(Number);
                const totalParts = ratioParts[0] + ratioParts[1];
                const dryVol = (item.volume || 0) * 1.33;
                const cementVol = dryVol * (ratioParts[0] / totalParts);
                // Slurry: 3.5kg/m2 -> Area * 3.5 / 50
                const area = (item.area || ((item.roomDims?.l || 0) * (item.roomDims?.w || 0)));
                const slurryBags = (area * 3.5) / 50;
                return sum + (cementVol / 0.035) + slurryBags;
            }, 0));

            const totalSand = items.reduce((sum, item) => {
                if (item.ratio === 'CHEMICAL') return sum;
                const ratioParts = (item.ratio || '1:6').split(':').map(Number);
                const totalParts = ratioParts[0] + ratioParts[1];
                const dryVol = (item.volume || 0) * 1.33;
                return sum + (dryVol * (ratioParts[1] / totalParts));
            }, 0).toFixed(2);

            const totalGrout = Math.ceil(items.reduce((sum, item) => {
                const area = (item.area || ((item.roomDims?.l || 0) * (item.roomDims?.w || 0)));
                return sum + (area * (50 / 70));
            }, 0));



            doc.text(`Total Tiles: ${totalTiles}`, m, y);
            y += 6;
            doc.text(`Total Mortar Vol: ${totalVol.toFixed(3)} m3`, m, y);

            y += 8;
            doc.setFontSize(12).setFont('helvetica', 'bold');
            doc.text("Material Requirement", m, y);
            y += 6;
            doc.setFontSize(11).setFont('helvetica', 'normal');

            doc.text(`Total Cement: ${totalCement} Bags (inc. Slurry)`, m, y);
            y += 6;
            doc.text(`Total Sand: ${totalSand} m3`, m, y);
            y += 6;
            doc.text(`Total Grout/Filler: ${totalGrout} kg`, m, y);
        }

        doc.save(`${estimation.title || 'Estimation'}.pdf`);
        return true;
    } catch (err) {
        console.error("PDF Generation Error:", err);
        alert("Error generating PDF: " + err.message);
        return false;
    }
};

export const generateOptimizationPDF = (estimationTitle, results, totalStockUsed, totalWaste) => {
    try {
        const doc = new jsPDF();
        const m = 15;
        let y = 20;

        // Title
        doc.setFontSize(22).setTextColor(0, 86, 179).setFont('helvetica', 'bold');
        doc.text("Optimization Result", 105, y, { align: 'center' });
        y += 10;
        doc.setFontSize(14).setTextColor(50).setFont('helvetica', 'normal');
        doc.text(estimationTitle || "Project", 105, y, { align: 'center' });

        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(m, y + 5, 195, y + 5);
        y += 15;

        // Overall Summary
        doc.setFontSize(12).setTextColor(0).setFont('helvetica', 'bold');
        doc.text(`Total Stock Bars (12m): ${totalStockUsed}`, m, y);
        y += 6;
        doc.text(`Total Waste: ${totalWaste.toFixed(3)} m`, m, y);
        y += 10;

        // Process each diameter
        Object.keys(results).sort((a, b) => b - a).forEach(dia => {
            // Check page break
            if (y > 250) { doc.addPage(); y = 20; }

            doc.setFontSize(14).setTextColor(0, 86, 179).setFont('helvetica', 'bold');
            doc.text(`Diameter: ${dia} mm`, m, y);
            y += 5;

            // Grouping Logic
            const groupedStocks = results[dia].reduce((acc, stock, i) => {
                const cutsKey = stock.cuts.map(c => c.cuttingLength.toFixed(3)).sort().join(';');
                const key = `${stock.isScrap}-${stock.length}-${stock.remaining.toFixed(4)}-${cutsKey}`;

                const last = acc[acc.length - 1];
                if (last && last.key === key) {
                    last.count++;
                    last.stocks.push(stock);
                } else {
                    acc.push({ key, stocks: [stock], count: 1, startIndex: i + 1 });
                }
                return acc;
            }, []);

            const tableHead = [['Stock Range', 'Qty', 'Cutting Pattern', 'Waste', 'Usage']];
            const tableBody = [];

            groupedStocks.forEach(group => {
                const isScrap = group.stocks[0].isScrap;
                const stockLabel = isScrap
                    ? `Old (${group.stocks[0].length}m)`
                    : (group.count > 1 ? `#${group.startIndex}-${group.startIndex + group.count - 1}` : `#${group.startIndex}`);

                // Cutting Pattern Summary
                const patternCounts = {};
                group.stocks[0].cuts.forEach(c => {
                    const len = c.cuttingLength.toFixed(3);
                    patternCounts[len] = (patternCounts[len] || 0) + 1;
                });
                const patternStr = Object.entries(patternCounts)
                    .map(([len, count]) => `${len}m (x${count})`)
                    .join(', ');

                // Marks Summary
                const allMarks = [...new Set(group.stocks.flatMap(s => s.cuts.map(c => c.barMark)))].sort();
                const marksStr = allMarks.join(', ');

                tableBody.push([
                    stockLabel,
                    group.count,
                    patternStr,
                    group.stocks[0].remaining.toFixed(3),
                    marksStr
                ]);
            });

            autoTable(doc, {
                startY: y,
                head: tableHead,
                body: tableBody,
                theme: 'grid',
                headStyles: { fillColor: [0, 86, 179], fontSize: 10 },
                styles: { fontSize: 10, cellPadding: 3 },
                columnStyles: {
                    0: { cellWidth: 25, halign: 'center' }, // Stock Range
                    1: { cellWidth: 15, halign: 'center', fontStyle: 'bold' }, // Qty
                    2: { cellWidth: 50 }, // Cutting Pattern
                    3: { cellWidth: 20, halign: 'center', fontStyle: 'bold' }, // Waste
                    4: { cellWidth: 'auto', fontSize: 8, textColor: 100 } // Usage (auto width)
                },
                didParseCell: function (data) {
                    if (data.section === 'body' && data.column.index === 3) { // Waste Column
                        const val = parseFloat(data.cell.raw);
                        if (val > 1) {
                            data.cell.styles.textColor = [220, 38, 38]; // Red
                        } else {
                            data.cell.styles.textColor = [16, 185, 129]; // Green
                        }
                    }
                }
            });

            y = doc.lastAutoTable.finalY + 15;
        });

        doc.save(`${estimationTitle}_Optimization.pdf`);
        return true;
    } catch (err) {
        console.error("Optimization PDF Error:", err);
        alert("Error generating PDF: " + err.message);
        return false;
    }
};
