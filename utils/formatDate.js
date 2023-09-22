const formatDate = (date, format) => {
	// date = date * 1000;
	const d = new Date(date);
	const year = d.getFullYear();
	const month = (d.getMonth() + 1).toString().padStart(2, '0');
	const day = d.getDate().toString().padStart(2, '0');
	let hour = d.getHours().toString().padStart(2, '0');
	const minute = d.getMinutes().toString().padStart(2, '0');
	const seconds = d.getSeconds().toString().padStart(2, '0');


	const ampm = hour >= 12 ? 'PM' : 'AM';
	if (format === 'hh:mm') {
		hour = hour % 12;
		hour = hour ? hour : 12;
	}

	if (format === 'dd-mm-yyyy') return `${day}-${month}-${year}`;
	if (format === 'dd-mm-yyyy hh:mm:ss') return `${day}-${month}-${year} ${hour}:${minute}:${seconds}`;
	if (format === 'yyyy-mm-dd hh:mm:ss') return `${year}-${month}-${day} ${hour}:${minute}:${seconds}`;
	if (format === 'hh:mm') return `${hour}:${minute} ${ampm}`;
	if (format === 'dd') return `${day}`;
	if (format === 'mm') return `${month}`;
	if (format === 'yyyy') return `${year}`;

	return `${day}-${month}-${year} ${hour}:${minute}:${seconds}`;
}

module.exports = formatDate;