import mongoose from 'mongoose';
import Site from '../models/Site';
import Company from '../models/Company';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load env from server root (two levels up)
dotenv.config({ path: path.join(__dirname, '../../.env') });

const checkSites = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGO_URI || '');
        console.log('MongoDB Connected');

        // 1. DUMP COMPANIES
        const companies = await Company.find({});
        console.log(`\nTotal Companies Found: ${companies.length}`);

        const output: string[] = [];

        output.push('COMPANIES:');
        output.push('==========================================');
        companies.forEach(comp => {
            output.push(`Company: "${comp.name}"`);
            output.push(`   ID: ${comp._id}`);
            output.push(`   OwnerID: ${comp.ownerId}`);
            output.push('------------------------------------------');
        });

        // 2. INJECT CORRECT DUMMY FOR "Test" COMPANY
        // ID for Company "Test" found from previous dump: 69556d503a020fe2d8e8b578
        const testCompanyId = "69556d503a020fe2d8e8b578";

        const correctDummy = new Site({
            name: "Restorable Test Site",
            address: "Test Location",
            companyId: testCompanyId,
            deletedAt: new Date(),
            permanentDeleteAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        });
        await correctDummy.save();
        console.log(`Created correct dummy site for 'Test' company: ${correctDummy._id}`);

        // 3. DUMP SITES
        const sites = await Site.find({});
        console.log(`\nTotal Sites Found: ${sites.length}`);

        output.push('\nSITES:');
        output.push('==========================================');

        sites.forEach(site => {
            output.push(`Site: "${site.name}"`);
            output.push(`   ID: ${site._id}`);
            output.push(`   CompanyID: ${site.companyId}`);
            output.push(`   DeletedAt: ${site.deletedAt ? site.deletedAt.toISOString() : 'NULL'}`);
            // @ts-ignore
            if (site.permanentDeleteAt) {
                // @ts-ignore
                output.push(`   PermanentDeleteAt: ${site.permanentDeleteAt.toISOString()}`);
            }
            output.push('------------------------------------------');
        });

        const deletedSites = sites.filter(s => s.deletedAt != null);
        output.push(`\nSummary: ${deletedSites.length} deleted sites found.`);

        fs.writeFileSync(path.join(__dirname, 'db_dump.txt'), output.join('\n'));
        console.log('Dump written to db_dump.txt');

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
};

checkSites();
