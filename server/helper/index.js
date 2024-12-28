const nodemailer = require('nodemailer');

exports.sendEmail = dataEmail => {
    const transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT,
        secure: false,
        requireTLS: true, 
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    })
    return(
        transporter.sendMail(dataEmail)
        .then(info => console.log('Email sent: ', info.response))
        .catch(err => console.log('Terjadi Kesalahan: ', err))
    )
    // console.log(dataEmail);
}