const sql = require('mssql');

const config = {
  userver: "*****",
  database: "********",
  options: {
    encrypt: false,
    trustServerCertificate: true,
  },
  authentication: {
    type: "ntlm",
    options: {
      domain: "",  
      userName: "", 
      password: ""  
    }
  }
};

module.exports = {
  connect: () => sql.connect(config)
};
