class SecureReportHandler {
    constructor(encryptionPassword) {
        this.encryption = new SecureEncryption();
        this.password = encryptionPassword;
        this.sensitiveFields = ['deskripsi_kejadian', 'nama_pelaku', 'detail_pelaku'];
    }

    async encryptReport(reportData) {
        const sensitiveData = {};
        const publicData = { ...reportData };

        for (const field of this.sensitiveFields) {
            if (reportData[field]) {
                sensitiveData[field] = reportData[field];
                delete publicData[field];
            }
        }

        if (Object.keys(sensitiveData).length > 0) {
            publicData.encrypted_data = await this.encryption.encryptObject(
                sensitiveData,
                this.password
            );
            publicData.is_encrypted = true;
        }

        return publicData;
    }

    async decryptReport(encryptedReport) {
        if (!encryptedReport.is_encrypted || !encryptedReport.encrypted_data) {
            return encryptedReport;
        }

        try {
            const decryptedData = await this.encryption.decryptObject(
                encryptedReport.encrypted_data,
                this.password
            );

            const fullReport = { ...encryptedReport };
            Object.assign(fullReport, decryptedData);
            delete fullReport.encrypted_data;
            delete fullReport.is_encrypted;

            return fullReport;
        } catch (error) {
            console.error('Decryption failed:', error);
            throw new Error('Gagal mendekripsi laporan. Pastikan Anda memiliki akses yang sesuai.');
        }
    }

    async submitEncryptedReport(formData, apiEndpoint) {
        const encryptedData = await this.encryptReport(formData);
        
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'same-origin',
            body: JSON.stringify(encryptedData)
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    getEncryptionStatus() {
        return {
            enabled: true,
            algorithm: 'AES-256-GCM',
            sensitiveFields: this.sensitiveFields
        };
    }
}

async function promptForEncryptionKey(forDecryption = false) {
    const message = forDecryption 
        ? 'Masukkan password dekripsi untuk membaca laporan:'
        : 'Masukkan password enkripsi untuk mengamankan laporan:';
    
    const password = prompt(message);
    
    if (!password) {
        throw new Error('Password enkripsi diperlukan');
    }
    
    if (!forDecryption && password.length < 8) {
        alert('Password enkripsi minimal 8 karakter untuk keamanan yang lebih baik');
        return promptForEncryptionKey(forDecryption);
    }
    
    return password;
}
