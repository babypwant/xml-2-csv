import { simplify, parse } from "./tXml.js";

const dataHeaders = ['property_id', 'account_number', 'name', 'address1', 'address2', 'city', 'state_prov', "country_code", 'postal_code', 'primary_contact_id ', 'notes', 'survery_compliance', 'last_survey', 'next_survey'];
let data = [];
let xmlFile;
let fileReader;

const handleFileRead = () => {
    const content = fileReader.result; // we receive the file passed into FileReader
    const xmlData = parse(content)
    xmlFile = simplify(xmlData[1]?.children)
    // parsing and simplifying the xml data to make the data arrays with objects within them.
    data.push(dataHeaders); // we sets the headers for our csv file here
    try {
        xmlFile.T_Facility.forEach((facility) => {
            let metadata = [];
            let previousDate;
            let nextDate;

            //Turnery operations for data we are looking for; does this data exists ? if so push data into metadata array : if not push in an empty string
            facility.Facility_ID ? metadata.push(facility.Facility_ID) : metadata.push(""); //property_id
            facility.Facility_Account_Number ? metadata.push(facility.Facility_Account_Number) : metadata.push(""); //account_number
            facility.Facility_Name ? metadata.push(facility.Facility_Name) : metadata.push(""); //name
            facility.Service_Address_Full ? metadata.push(facility.Service_Address_Full) : metadata.push(""); //address1
            metadata.push(""); //add address2 ? cannot be found, testing empty string in its place
            facility.Service_Address_City ? metadata.push(facility.Service_Address_City) : metadata.push(""); //city
            facility.Service_Address_State ? metadata.push(facility.Service_Address_State) : metadata.push(""); //state_prov
            metadata.push("US") //country code
            facility.Service_Address_Zip_Code ? metadata.push(facility.Service_Address_Zip_Code) : metadata.push(""); //postal_code
            facility.Facility_Contact_Mgr_ID ? metadata.push(facility.Facility_Contact_Mgr_ID) : metadata.push(""); //primary_contact_Id
            facility.Facility_Comments_01 ? metadata.push(facility.Facility_Comments_01) : metadata.push(""); //notes
            //survery_complicance,prev_date,next_date
            // service_compliance false if no start date or end date,  empty if no start date provided, empty if no end date provided
            if (facility.Facility_Survey_Date_Last && facility.Facility_Survey_Date_Next) {
                metadata.push("False");
                previousDate = facility.Facility_Survey_Date_Last.slice(0, 10) // cleans up date string
                nextDate = facility.Facility_Survey_Date_Next.slice(0, 10);
                metadata.push(previousDate);
                metadata.push(nextDate);
            } else if (facility.Facility_Survey_Date_Last && !facility.Facility_Survey_Date_Next) {
                metadata.push("");
                previousDate = facility.Facility_Survey_Date_Last.slice(0, 10)
                metadata.push(previousDate);
                metadata.push("");
            } else if (!facility.Facility_Survey_Date_Last && !facility.Facility_Survey_Date_Last) {
                metadata.push("");
                metadata.push("");
                metadata.push("");
            };
            data.push(metadata); // Put all the data together
        });

        let csvContent = ""
            + data.map(e => e.join(",")).join("\n");
        // we join all arrays into strings from our data array passying them in to csvContent
        let csvData = new Blob([csvContent], { type: 'text/csv' }); // pass in the string data into a blob object and specify the data type
        let csvUrl = URL.createObjectURL(csvData); // convert the blob into a URL string which can be attached to an <a> tag
        let link = document.createElement('a'); // we create an anchor element so we can attach an the our new csv file to it as the source
        link.href = csvUrl; // link the csv file
        link.target = '_blank'; //opens new tab to download
        link.download = "converted" + '.csv'; //we name the file "converted" and add the .csv extension
        link.click(); // we click our own element to download our sourced file.

        let secondaryLink = document.querySelectorAll('dl-link')
        secondaryLink.href = csvUrl;
        secondaryLink.target = '_blank'
        link.download = "converted" + '.csv';
        if (errors) {
            setErrors(null) //if errors we're present before this is where we reset them
        }
        setFormState(false) // change what is rendered in jsx based on setFormState property
    }
    catch (e) {
        console.log("Thank you for using xml to csv converter by Gary Rios")
    };
};

const handleUpload = (file) => {
    fileReader = new FileReader(); // a new instance of FileReader is created which allows us to read the contents of the uploaded file
    fileReader.onloadend = handleFileRead; // Once we finish reading the data, the assigned function will be invoke
    fileReader.readAsText(file); // We feed our uploaded file into the File Reader which will invoke our handleFileRead function passing in the file.
};

let uploadedFile = document.getElementById('uploaded-file')

uploadedFile.addEventListener('change', (e) => {
    handleUpload(e.target.files[0]);
});