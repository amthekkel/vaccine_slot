const cron = require("node-cron");
const express = require("express");
const request = require("request");
const moment = require("moment");
const nodemailer = require("nodemailer");
require("dotenv").config();

const port = 3000;
// const age_groups = [18, 45];
const age_groups = [18];
const fee_type = 1;
const default_district_id = 307;

app = express();

function check_available_slots(district_id, start_date) {
	try {
		// console.log("checking for slots");
		if (start_date === undefined) {
			let moment_obj = moment();
			start_date = moment_obj.format("DD-MM-YYYY");
		}

		if (district_id === undefined) {
			district_id = default_district_id;
		}

		let url =
			"https://cdn-api.co-vin.in/api/v2/appointment/sessions/public/calendarByDistrict?district_id=" +
			district_id +
			"&date=" +
			start_date;

		request(url, function (error, response, body) {
			//console.error("error:", error); // Print the error if one occurred
			//console.log("statusCode:", response && response.statusCode); // Print the response status code if a response was received
			//console.log("body:", body); // Print the HTML for the Google homepage.

			if (!error && response.statusCode == 200) {
				//console.log(body); //
				let centre_obj = JSON.parse(body);

				let centers = centre_obj.centers || [];
				let available_centers = [];
				let message = [];

				console.log("checking number of centers " + centers.length);

				centers.forEach((center) => {
					//console.log("center name " + center.name);
					let sessions = center.sessions || [];
					let fee_type = center.fee_type || "";
					sessions.forEach((session) => {
						let availability = session.available_capacity || 0;
						let session_age_limit = session.min_age_limit || 45;
						if (availability > 0 && age_groups.includes(session_age_limit)) {
							if (typeof available_centers[center.name] === "undefined") {
								available_centers[center.name] = session.vaccine;
								message.push(
									"available center " +
										center.name +
										" vaccine " +
										session.vaccine +
										" FEE type " +
										fee_type
								);
							}
						}
					});
				});

				if (message.length > 0) {
					console.log(message.join("\n"));
					send_email(message.join("\n"));
				}

				//server.close();
			}
		});
	} catch (e) {
		console.log("Error getting data " + e.message);
	}
}

function send_email(message) {
	let email_user = process.env.MAIL_USERNAME;
	let email_pass = process.env.MAIL_PASSWORD;

	let transporter = nodemailer.createTransport({
		service: process.env.MAIL_DRIVER,
		host: process.env.MAIL_HOST,
		auth: {
			user: email_user,
			pass: email_pass
		}
	});

	let mailOptions = {
		from: process.env.FROM_EMAIL,
		to: process.env.TO_EMAIL,
		subject: "Covid Vaccine Free slot",
		text: message
	};

	try {
		transporter.sendMail(mailOptions, function (error, info) {
			if (error) {
				console.log(error);
			} else {
				console.log("Email sent: " + info.response);
			}
		});
	} catch (e) {
		console.log("Error sending email " + e.message);
	}
}

//run function every 10 minute
cron.schedule("0 */10 * * * *", function () {
	console.log("---------------------------------------------------------- ");
	console.log("CRON STARTED AT " + moment().format());
	check_available_slots();
});

const server = app.listen(port, () => console.log("Server ready"));

process.on("SIGTERM", () => {
	server.close(() => {
		console.log("Process terminated");
	});
});
