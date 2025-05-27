const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Define grade-wise chapter mapping for Biology syllabus
const GRADE_MAPPING = {
  // The Living World
  'the-living-world': {
    11: ['Chapter 1: The Living World', 'Chapter 2: Biological Classification'],
    12: []
  },
  
  // Biological Classification
  'biological-classification': {
    11: ['Chapter 2: Biological Classification', 'Chapter 3: Plant Kingdom', 'Chapter 4: Animal Kingdom'],
    12: []
  },
  
  // Plant Kingdom
  'plant-kingdom': {
    11: ['Chapter 3: Plant Kingdom'],
    12: []
  },
  
  // Animal Kingdom
  'animal-kingdom': {
    11: ['Chapter 4: Animal Kingdom'],
    12: []
  },
  
  // Morphology in Flowering Plants
  'morphology-in-flowering-plants': {
    11: ['Chapter 5: Morphology of Flowering Plants'],
    12: []
  },
  
  // Anatomy in Flowering Plants
  'anatomy-in-flowering-plants': {
    11: ['Chapter 6: Anatomy of Flowering Plants'],
    12: []
  }
};

// Extended mapping for common biology topics
const EXTENDED_GRADE_MAPPING = {
  // Grade 11 topics
  11: [
    'the living world',
    'biological classification',
    'plant kingdom',
    'animal kingdom',
    'morphology of flowering plants',
    'anatomy of flowering plants',
    'structural organisation in animals',
    'biomolecules',
    'cell cycle and cell division',
    'transport in plants',
    'mineral nutrition',
    'photosynthesis in higher plants',
    'respiration in plants',
    'plant growth and development',
    'digestion and absorption',
    'breathing and exchange of gases',
    'body fluids and circulation',
    'excretory products and their elimination',
    'locomotion and movement',
    'neural control and coordination',
    'chemical coordination and integration'
  ],
  
  // Grade 12 topics
  12: [
    'reproduction in organisms',
    'sexual reproduction in flowering plants',
    'human reproduction',
    'reproductive health',
    'principles of inheritance and variation',
    'molecular basis of inheritance',
    'evolution',
    'human health and disease',
    'strategies for enhancement in food production',
    'microbes in human welfare',
    'biotechnology principles and processes',
    'biotechnology and its applications',
    'organisms and populations',
    'ecosystem',
    'biodiversity and conservation',
    'environmental issues'
  ]
};

class ExcelGradeSplitter {
  constructor(inputPath = null) {
    this.inputDir = inputPath || './qrCodes/entrance/biology';
    this.outputDir = './output_files';
    this.createDirectories();
  }

  createDirectories() {
    // Create output directories if they don't exist
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
    
    const grade11Dir = path.join(this.outputDir, 'Grade_11');
    const grade12Dir = path.join(this.outputDir, 'Grade_12');
    
    if (!fs.existsSync(grade11Dir)) {
      fs.mkdirSync(grade11Dir, { recursive: true });
    }
    
    if (!fs.existsSync(grade12Dir)) {
      fs.mkdirSync(grade12Dir, { recursive: true });
    }
  }

  determineGrade(filename, sheetName, rowData) {
    const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    const cleanSheetName = sheetName ? sheetName.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim() : '';
    const rowText = Array.isArray(rowData) ? rowData.join(' ').toLowerCase() : '';
    
    // Check against Grade 11 topics
    for (const topic of EXTENDED_GRADE_MAPPING[11]) {
      if (cleanFilename.includes(topic) || cleanSheetName.includes(topic) || rowText.includes(topic)) {
        return 11;
      }
    }
    
    // Check against Grade 12 topics
    for (const topic of EXTENDED_GRADE_MAPPING[12]) {
      if (cleanFilename.includes(topic) || cleanSheetName.includes(topic) || rowText.includes(topic)) {
        return 12;
      }
    }
    
    // Default based on common patterns
    if (cleanFilename.includes('kingdom') || cleanFilename.includes('classification') || 
        cleanFilename.includes('morphology') || cleanFilename.includes('anatomy')) {
      return 11;
    }
    
    if (cleanFilename.includes('reproduction') || cleanFilename.includes('inheritance') || 
        cleanFilename.includes('evolution') || cleanFilename.includes('biotechnology')) {
      return 12;
    }
    
    return null; // Unable to determine
  }

  processExcelFile(filePath) {
    try {
      console.log(`Processing: ${path.basename(filePath)}`);
      
      const workbook = XLSX.readFile(filePath);
      const filename = path.basename(filePath, '.xlsx');
      
      const grade11Data = {};
      const grade12Data = {};
      const undeterminedData = {};
      
      workbook.SheetNames.forEach(sheetName => {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) return;
        
        // Determine grade for the entire sheet first
        let sheetGrade = this.determineGrade(filename, sheetName, jsonData[0]);
        
        // If sheet grade is undetermined, try to determine from content
        if (!sheetGrade && jsonData.length > 1) {
          const sampleRows = jsonData.slice(0, 5).flat().join(' ');
          sheetGrade = this.determineGrade(filename, '', [sampleRows]);
        }
        
        if (sheetGrade === 11) {
          grade11Data[sheetName] = jsonData;
        } else if (sheetGrade === 12) {
          grade12Data[sheetName] = jsonData;
        } else {
          undeterminedData[sheetName] = jsonData;
          console.log(`⚠️  Could not determine grade for sheet: ${sheetName} in ${filename}`);
        }
      });
      
      // Save Grade 11 data
      if (Object.keys(grade11Data).length > 0) {
        this.saveWorkbook(grade11Data, path.join(this.outputDir, 'Grade_11', `${filename}_Grade11.xlsx`));
        console.log(`✅ Created Grade 11 file: ${filename}_Grade11.xlsx`);
      }
      
      // Save Grade 12 data
      if (Object.keys(grade12Data).length > 0) {
        this.saveWorkbook(grade12Data, path.join(this.outputDir, 'Grade_12', `${filename}_Grade12.xlsx`));
        console.log(`✅ Created Grade 12 file: ${filename}_Grade12.xlsx`);
      }
      
      // Save undetermined data for manual review
      if (Object.keys(undeterminedData).length > 0) {
        this.saveWorkbook(undeterminedData, path.join(this.outputDir, `${filename}_Undetermined.xlsx`));
        console.log(`⚠️  Created undetermined file: ${filename}_Undetermined.xlsx`);
      }
      
    } catch (error) {
      console.error(`Error processing ${filePath}:`, error.message);
    }
  }

  saveWorkbook(data, outputPath) {
    const newWorkbook = XLSX.utils.book_new();
    
    Object.keys(data).forEach(sheetName => {
      const worksheet = XLSX.utils.aoa_to_sheet(data[sheetName]);
      XLSX.utils.book_append_sheet(newWorkbook, worksheet, sheetName);
    });
    
    XLSX.writeFile(newWorkbook, outputPath);
  }

  processAllFiles() {
    // Validate input directory
    if (!fs.existsSync(this.inputDir)) {
      console.error(`❌ Input directory does not exist: ${this.inputDir}`);
      console.log('Please provide a valid folder path.');
      return;
    }

    if (!fs.lstatSync(this.inputDir).isDirectory()) {
      console.error(`❌ Input path is not a directory: ${this.inputDir}`);
      return;
    }
    
    // Get all Excel files from the specified directory
    const files = fs.readdirSync(this.inputDir)
      .filter(file => file.endsWith('.xlsx') || file.endsWith('.xls'))
      .map(file => path.join(this.inputDir, file));
    
    if (files.length === 0) {
      console.log(`No Excel files found in: ${this.inputDir}`);
      console.log('Please ensure the directory contains .xlsx or .xls files.');
      return;
    }
    
    console.log(`📁 Input directory: ${path.resolve(this.inputDir)}`);
    console.log(`📁 Output directory: ${path.resolve(this.outputDir)}`);
    console.log(`Found ${files.length} Excel files to process...\n`);
    
    files.forEach(file => {
      this.processExcelFile(file);
      console.log(''); // Add spacing between files
    });
    
    console.log('🎉 Processing complete!');
    console.log(`📁 Grade 11 files saved to: ${path.resolve(this.outputDir, 'Grade_11')}`);
    console.log(`📁 Grade 12 files saved to: ${path.resolve(this.outputDir, 'Grade_12')}`);
    console.log('📝 Review any "Undetermined" files for manual classification.');
  }

  // Method to add custom mappings
  addCustomMapping(filename, grade) {
    const cleanFilename = filename.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
    if (grade === 11 || grade === 12) {
      EXTENDED_GRADE_MAPPING[grade].push(cleanFilename);
      console.log(`Added custom mapping: "${cleanFilename}" → Grade ${grade}`);
    }
  }
}

// Get input folder path from command line arguments
const args = process.argv.slice(2);
const inputFolderPath = args[0];

if (!inputFolderPath) {
  console.log('📁 Excel Grade Splitter');
  console.log('Usage: node excel_grade_splitter.js <input_folder_path>');
  console.log('Example: node excel_grade_splitter.js "C:/Users/Documents/Biology_Files"');
  console.log('Example: node excel_grade_splitter.js "./my_excel_files"');
  process.exit(1);
}

// Usage
const splitter = new ExcelGradeSplitter(inputFolderPath);

// Add any custom mappings if needed
// splitter.addCustomMapping('your-custom-file-pattern', 11);

// Process all files
splitter.processAllFiles();

// Export for use as module
module.exports = ExcelGradeSplitter;