import React, { useState } from 'react';

function App() {
  const [formData, setFormData] = useState({
    filingStatus: 'single',
    income: '',
    age: '',
    dependents: '0'
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const calculateTax = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('http://localhost:8080/calculate-tax', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Tax calculation failed');
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'An error occurred during calculation');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f5f5f5',
      padding: '2rem',
      fontFamily: 'Arial, sans-serif'
    },
    maxWidth: {
      maxWidth: '1200px',
      margin: '0 auto'
    },
    title: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      textAlign: 'center',
      color: '#333',
      marginBottom: '2rem'
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: '2rem'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      padding: '2rem'
    },
    cardTitle: {
      fontSize: '1.5rem',
      fontWeight: '600',
      marginBottom: '1.5rem',
      color: '#333'
    },
    formGroup: {
      marginBottom: '1rem'
    },
    label: {
      display: 'block',
      fontSize: '0.9rem',
      fontWeight: '500',
      color: '#555',
      marginBottom: '0.5rem'
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '1rem',
      outline: 'none',
      transition: 'border-color 0.3s'
    },
    select: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #ddd',
      borderRadius: '4px',
      fontSize: '1rem',
      outline: 'none',
      backgroundColor: 'white'
    },
    button: {
      width: '100%',
      backgroundColor: '#007bff',
      color: 'white',
      padding: '0.75rem 1.5rem',
      border: 'none',
      borderRadius: '4px',
      fontSize: '1rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.3s'
    },
    buttonDisabled: {
      backgroundColor: '#ccc',
      cursor: 'not-allowed'
    },
    error: {
      backgroundColor: '#fee',
      border: '1px solid #fcc',
      borderRadius: '4px',
      padding: '0.75rem',
      color: '#c33',
      marginBottom: '1rem'
    },
    emptyState: {
      textAlign: 'center',
      padding: '3rem',
      color: '#666'
    },
    result: {
      textAlign: 'center',
      marginBottom: '2rem'
    },
    resultAmount: {
      fontSize: '2.5rem',
      fontWeight: 'bold',
      marginBottom: '0.5rem'
    },
    resultLabel: {
      color: '#666',
      fontSize: '1rem'
    },
    breakdown: {
      backgroundColor: '#f8f9fa',
      borderRadius: '4px',
      padding: '1rem'
    },
    breakdownRow: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '0.5rem'
    },
    breakdownTotal: {
      borderTop: '1px solid #ddd',
      paddingTop: '0.5rem',
      fontWeight: 'bold',
      fontSize: '1.1rem'
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.maxWidth}>
        <h1 style={styles.title}>Tax Calculator 2024</h1>
        
        <div style={styles.grid}>
          {/* Form Section */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Tax Information</h2>
            
            <form onSubmit={calculateTax}>
              <div style={styles.formGroup}>
                <label style={styles.label}>Filing Status</label>
                <select
                  name="filingStatus"
                  value={formData.filingStatus}
                  onChange={handleInputChange}
                  style={styles.select}
                  required
                >
                  <option value="single">Single</option>
                  <option value="married">Married Filing Jointly</option>
                  <option value="marriedSeparate">Married Filing Separately</option>
                  <option value="headOfHousehold">Head of Household</option>
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Annual Income *</label>
                <input
                  type="number"
                  name="income"
                  value={formData.income}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="Enter your annual income"
                  required
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Age</label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  style={styles.input}
                  placeholder="Enter your age"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Number of Dependents</label>
                <input
                  type="number"
                  name="dependents"
                  value={formData.dependents}
                  onChange={handleInputChange}
                  style={styles.input}
                  min="0"
                />
              </div>

              {error && (
                <div style={styles.error}>
                  Error: {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...styles.button,
                  ...(loading ? styles.buttonDisabled : {})
                }}
              >
                {loading ? 'Calculating...' : 'Calculate Tax'}
              </button>
            </form>
          </div>

          {/* Results Section */}
          <div style={styles.card}>
            <h2 style={styles.cardTitle}>Tax Results</h2>
            
            {!result ? (
              <div style={styles.emptyState}>
                <p>Enter your tax information and click "Calculate Tax" to see your results</p>
              </div>
            ) : (
              <div>
                <div style={styles.result}>
                  <div style={{
                    ...styles.resultAmount,
                    color: result.refundOrOwed.type === 'refund' ? '#28a745' : '#dc3545'
                  }}>
                    {formatCurrency(Math.abs(result.refundOrOwed.amount))}
                  </div>
                  <p style={styles.resultLabel}>
                    {result.refundOrOwed.type === 'refund' ? 'Expected Refund' : 'Amount You Owe'}
                  </p>
                </div>

                <div style={styles.breakdown}>
                  <div style={styles.breakdownRow}>
                    <span>Filing Status:</span>
                    <span>{result.filingStatus}</span>
                  </div>
                  <div style={styles.breakdownRow}>
                    <span>Total Income:</span>
                    <span>{formatCurrency(result.income.totalGrossIncome)}</span>
                  </div>
                  <div style={styles.breakdownRow}>
                    <span>Taxable Income:</span>
                    <span>{formatCurrency(result.taxCalculation.taxableIncome)}</span>
                  </div>
                  <div style={styles.breakdownRow}>
                    <span>Federal Tax:</span>
                    <span>{formatCurrency(result.taxCalculation.federalIncomeTax)}</span>
                  </div>
                  <div style={{...styles.breakdownRow, ...styles.breakdownTotal}}>
                    <span>Total Tax Liability:</span>
                    <span>{formatCurrency(result.taxCalculation.totalTaxLiability)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;