const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Tax calculation functions
const calculateTax = (income, filingStatus, deductions = 0) => {
  // 2024 Tax Brackets (simplified)
  const taxBrackets = {
    single: [
      { min: 0, max: 11000, rate: 0.10 },
      { min: 11001, max: 44725, rate: 0.12 },
      { min: 44726, max: 95375, rate: 0.22 },
      { min: 95376, max: 182050, rate: 0.24 },
      { min: 182051, max: 231250, rate: 0.32 },
      { min: 231251, max: 578125, rate: 0.35 },
      { min: 578126, max: Infinity, rate: 0.37 }
    ],
    married: [
      { min: 0, max: 22000, rate: 0.10 },
      { min: 22001, max: 89450, rate: 0.12 },
      { min: 89451, max: 190750, rate: 0.22 },
      { min: 190751, max: 364200, rate: 0.24 },
      { min: 364201, max: 462500, rate: 0.32 },
      { min: 462501, max: 693750, rate: 0.35 },
      { min: 693751, max: Infinity, rate: 0.37 }
    ]
  };

  const brackets = taxBrackets[filingStatus] || taxBrackets.single;
  const taxableIncome = Math.max(0, income - deductions);
  
  let totalTax = 0;
  let remainingIncome = taxableIncome;
  
  for (const bracket of brackets) {
    if (remainingIncome <= 0) break;
    
    const taxableAtThisBracket = Math.min(remainingIncome, bracket.max - bracket.min + 1);
    if (taxableAtThisBracket > 0) {
      totalTax += taxableAtThisBracket * bracket.rate;
      remainingIncome -= taxableAtThisBracket;
    }
  }
  
  return Math.round(totalTax * 100) / 100;
};

const calculateStandardDeduction = (filingStatus, age) => {
  const standardDeductions = {
    single: 13850,
    married: 27700,
    marriedSeparate: 13850,
    headOfHousehold: 20800
  };
  
  let deduction = standardDeductions[filingStatus] || standardDeductions.single;
  
  // Additional deduction for seniors (65+)
  if (age >= 65) {
    deduction += filingStatus === 'married' ? 1500 : 1850;
  }
  
  return deduction;
};

const calculateEITC = (income, filingStatus, children) => {
  // Simplified Earned Income Tax Credit calculation
  const eitcLimits = {
    0: { single: 17640, married: 23260, credit: 600 },
    1: { single: 46560, married: 52918, credit: 3995 },
    2: { single: 51567, married: 58250, credit: 6604 },
    3: { single: 55529, married: 62044, credit: 7430 }
  };
  
  const childCount = Math.min(children, 3);
  const limits = eitcLimits[childCount];
  
  if (!limits) return 0;
  
  const incomeLimit = filingStatus === 'married' ? limits.married : limits.single;
  
  if (income > incomeLimit) return 0;
  
  return limits.credit;
};

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/calculate-tax', upload.array('documents', 10), (req, res) => {
  try {
    const {
      filingStatus,
      income,
      age,
      dependents,
      itemizedDeductions,
      useStandardDeduction,
      w2Income,
      selfEmploymentIncome,
      interestIncome,
      dividendIncome,
      capitalGains,
      otherIncome
    } = req.body;

    // Validate required fields
    if (!filingStatus || !income) {
      return res.status(400).json({
        error: 'Missing required fields: filingStatus and income'
      });
    }

    // Parse numeric values
    const totalIncome = parseFloat(income) || 0;
    const userAge = parseInt(age) || 0;
    const numDependents = parseInt(dependents) || 0;
    const itemizedDeductionAmount = parseFloat(itemizedDeductions) || 0;
    
    // Additional income sources
    const additionalIncome = {
      w2: parseFloat(w2Income) || 0,
      selfEmployment: parseFloat(selfEmploymentIncome) || 0,
      interest: parseFloat(interestIncome) || 0,
      dividends: parseFloat(dividendIncome) || 0,
      capitalGains: parseFloat(capitalGains) || 0,
      other: parseFloat(otherIncome) || 0
    };

    const totalGrossIncome = totalIncome + 
      additionalIncome.w2 + 
      additionalIncome.selfEmployment + 
      additionalIncome.interest + 
      additionalIncome.dividends + 
      additionalIncome.capitalGains + 
      additionalIncome.other;

    // Calculate deductions
    const standardDeduction = calculateStandardDeduction(filingStatus, userAge);
    const deductionAmount = useStandardDeduction === 'false' ? 
      Math.max(itemizedDeductionAmount, standardDeduction) : 
      standardDeduction;

    // Calculate tax
    const federalTax = calculateTax(totalGrossIncome, filingStatus, deductionAmount);
    
    // Calculate EITC
    const eitc = calculateEITC(totalGrossIncome, filingStatus, numDependents);
    
    // Calculate self-employment tax (simplified)
    const selfEmploymentTax = additionalIncome.selfEmployment * 0.1413;
    
    // Calculate total tax liability
    const totalTaxLiability = federalTax + selfEmploymentTax - eitc;
    
    // Estimate withholding (simplified - usually 20% of W2 income)
    const estimatedWithholding = additionalIncome.w2 * 0.20;
    
    // Calculate refund or amount owed
    const refundOrOwed = estimatedWithholding - totalTaxLiability;
    
    // Process uploaded documents
    const uploadedDocuments = req.files ? req.files.map(file => ({
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    // Prepare response
    const result = {
      taxYear: 2024,
      filingStatus,
      taxpayerInfo: {
        age: userAge,
        dependents: numDependents
      },
      income: {
        totalGrossIncome,
        breakdown: {
          primary: totalIncome,
          ...additionalIncome
        }
      },
      deductions: {
        standardDeduction,
        itemizedDeductions: itemizedDeductionAmount,
        deductionUsed: deductionAmount,
        deductionType: useStandardDeduction === 'false' ? 'itemized' : 'standard'
      },
      taxCalculation: {
        taxableIncome: Math.max(0, totalGrossIncome - deductionAmount),
        federalIncomeTax: federalTax,
        selfEmploymentTax: selfEmploymentTax,
        earnedIncomeCredit: eitc,
        totalTaxLiability: Math.max(0, totalTaxLiability)
      },
      refundOrOwed: {
        estimatedWithholding,
        amount: refundOrOwed,
        type: refundOrOwed >= 0 ? 'refund' : 'owed'
      },
      uploadedDocuments,
      calculationDate: new Date().toISOString(),
      disclaimer: "This is a simplified tax calculation for estimation purposes only. Consult a tax professional for accurate filing."
    };

    res.json(result);
  } catch (error) {
    console.error('Tax calculation error:', error);
    res.status(500).json({
      error: 'Internal server error during tax calculation',
      message: error.message
    });
  }
});

app.post('/upload-documents', upload.array('documents', 10), (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No documents uploaded' });
    }

    const uploadedFiles = req.files.map(file => ({
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadDate: new Date().toISOString()
    }));

    res.json({
      message: 'Documents uploaded successfully',
      files: uploadedFiles
    });
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({
      error: 'Error uploading documents',
      message: error.message
    });
  }
});

// Error handling middleware
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size too large' });
    }
  }
  
  console.error('Unhandled error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

app.listen(PORT, () => {
  console.log(`Tax Engine API running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;