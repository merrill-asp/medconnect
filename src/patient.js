const Promise = require('bluebird')
const db = require('../config/db')
const acc = require('./account')

var register = function (user){
  return acc.register(user).then(function (result){
    if(result){
      return db.query('INSERT INTO PatientProfile (userID, gender, bloodType, address, phone) VALUES (?,?,"",?,?);', [result.id, user.gender, user.address, user.phone]).then(function (result){
        return result[0].affectedRows === 1
      })
    }
    return false
  })
}

var edit = function (user){
  return Promise.all([
    db.query('UPDATE Users SET lastName =?, firstName =? WHERE userID =?;', [user.last, user.first, user.id]),
    db.query('UPDATE PatientProfile SET bloodType =?, address =?, phone =? WHERE userID =?;', [user.blood, user.address, user.phone, user.id])
  ]).then(function (results){
    return results[0][0].affectedRows === 1 && results[1][0].affectedRows === 1
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var deletePatient = function (id){
  return Promise.all([
    acc.userExists(id),
    patientExists(id)
  ]).then(function (exists){
    if(exists[0] && exists[1]){
      return Promise.all([
        db.query('DELETE FROM PatientProfile WHERE userID=?;', [id]),
        acc.deleteUser(id)
      ]).then(function (results){
        return results[0].affectedRows && results[1]
      })
    }
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var patientExists = function (id){
  return db.query('SELECT 1 FROM PatientProfile WHERE userID =? LIMIT 1;', [id]).then( function (result){
    return result[0][0] !== undefined
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var info = function (id){
  return Promise.all([
    db.query('SELECT email, firstName, lastName FROM Users WHERE userID =? LIMIT 1;', [id]),
    db.query('SELECT bloodType, address, phone FROM PatientProfile WHERE userID =? LIMIT 1;', [id])
  ]).then(function (results){
    var tmp1 = results[0][0][0]
    var tmp2 = results[1][0][0]

    if(!tmp1 || !tmp2) return false

    return {
      email: tmp1.email,
      firstName: tmp1.firstName,
      lastName: tmp1.lastName,
      bloodType: tmp2.bloodType,
      address: tmp2.address,
      phone: tmp2.phone
    }
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var getDoctors = function (){
  return db.query('SELECT userID, address, experience FROM DoctorProfile;').then(function (doctors){
    return Promise.map(doctors[0], function (doctor){
      return Promise.all([
        db.query('SELECT firstName, lastName FROM Users WHERE userID =?;', doctor.userID),
        db.query('SELECT name FROM Specialties, SpecialtyDoctor WHERE Specialties._id = SpecialtyDoctor.specialtyID AND SpecialtyDoctor.doctorID =?;', [doctor.userID])
      ]).then(function (results){
        var tmp1 = results[0][0][0]
        var specs = results[1][0]
        var tmp = []
        for(var o in specs) {
  				var spec = specs[o]
  				tmp.push(spec.name)
  			}

        return {
          userID: doctor.userID,
          name: tmp1.firstName + ' ' + tmp1.lastName,
          address: doctor.address,
          exp: doctor.experience,
          specialties: tmp.join(', ')
        }
      })
    })
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var getDoctor = function (id){
  return db.query('SELECT phone, verified, volunteerNotes, otherNotes FROM DoctorProfile WHERE userID =? LIMIT 1;', [id]).then(function (results){
    if(!results[0]){ return false }

    var profile = results[0][0]

    return {
      phone: profile.phone,
      ver: profile.verified,
      vol: profile.volunteerNotes,
      notes: profile.otherNotes
    }
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var getDoctorDetails = function (id){
  return Promise.all([
    db.query('SELECT firstName, lastName FROM Users WHERE userID =? LIMIT 1;', [id]),
    db.query('SELECT address, phone, verified, experience, volunteerNotes, otherNotes, availability FROM DoctorProfile WHERE userID = ? LIMIT 1;', [id]),
    db.query('SELECT name FROM Specialties, SpecialtyDoctor WHERE Specialties._id = SpecialtyDoctor.specialtyID AND SpecialtyDoctor.doctorID = ?;', [id])
  ]).then(function (results){
    if(!results[0][0]){ return false }

    var doctor = results[0][0][0]
    var profile = results[1][0][0]
    var specialties = results[2][0]

    return {
      first: doctor.firstName,
      last: doctor.lastName,
      loc: profile.address,
      phone: profile.phone,
      ver: profile.verified,
      exp : profile.experience,
      vol: profile.volunteerNotes,
      notes: profile.otherNotes,
      availability: profile.availability,
      specialties: specialties
    }
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var getPatient = function (userId){
  return Promise.all([
    db.query('SELECT * FROM Users where userID = ? order by lastName, firstName;', [userId])
  ]).then(function (result){
    return {
      currentPatient: result[0][0][0]
    }
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var requestAppointment = function (patientId, doctorId, requestedDate){
  var date = new Date(requestedDate).toISOString().replace(/T/, ' ').replace(/\..+/, '')
  return db.query("INSERT INTO Visits (visitStatus, patientID, doctorID, visitDate, diagnosis, symptoms) VALUES (?,?,?,?,'','');", [db.REQUESTED_VISIT, patientId, doctorId, date]).then(function (result){
    return result[0].affectedRows === 1
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var getCurrentAppointments = function (patientID){
  return Promise.all([
    db.query('SELECT Visits.visitID, Visits.visitDate, Users.firstName, Users.lastName FROM Visits, Users WHERE Users.userID = Visits.doctorID AND Visits.visitStatus =? AND Visits.patientID =?;', [db.REQUESTED_VISIT, patientID]),
    db.query('SELECT Visits.visitID, Visits.visitDate, Users.firstName, Users.lastName FROM Visits, Users WHERE Users.userID = Visits.doctorID AND Visits.visitStatus =? AND Visits.patientID =?;', [db.REJECTED_VISIT, patientID]),
    db.query('SELECT Visits.visitID, Visits.visitDate, Users.firstName, Users.lastName FROM Visits, Users WHERE Users.userID = Visits.doctorID AND Visits.visitStatus =? AND Visits.patientID =?;', [db.ACCEPTED_VISIT, patientID]),
  ]).then(function (results){
    return {
      requested: results[0][0],
      rejected: results[1][0],
      accepted: results[2][0]
    }
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var getAppointmentDetail = function (visitID, patientID){
 return Promise.all([
   db.query('SELECT Visits.visitStatus, Visits.visitDate, Visits.diagnosis, Visits.symptoms, Users.firstName, Users.lastName FROM Visits, Users WHERE Users.userID = Visits.doctorID AND Visits.visitID =? AND Visits.patientID =? LIMIT 1;', [visitID, patientID]),
   db.query('SELECT noteID, note FROM Notes WHERE visitID =?;', [visitID]),
   db.query('SELECT * FROM Vitals WHERE visitID =? LIMIT 1;', [visitID]),
   db.query('SELECT * FROM MedicationPatient, Medications WHERE MedicationPatient.medicationID = Medications._id AND MedicationPatient.visitID =?;', [visitID]),
   db.query('SELECT * FROM ExternalData, DataType WHERE ExternalData.dataID = DataType._id AND ExternalData.visitID =?;', [visitID])
 ]).then(function (results){
   var visit = results[0][0][0]
   if(!visit){ return false }

   return {
     visit: visit,
     notes: results[1][0],
     vitals: results[2][0][0],
     prescriptions: results[3][0],
     images: results[4][0]
   }
 }).catch(function (err){
   console.log(err)
   return false
 })
}

var getPastAppointments = function (patientID){
  return db.query('SELECT Visits.visitID, Visits.visitDate, Users.firstName, Users.lastName FROM Visits, Users WHERE Users.userID = Visits.doctorID AND Visits.visitStatus =? AND Visits.patientID =?;', [db.COMPLETED_VISIT,patientID])
  .then(function (results){
    return results[0]
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var completeAppointment = function (visitID, patientID){
  return db.query('SELECT 1 FROM Visits WHERE Visits.visitID =? AND Visits.patientID =? LIMIT 1;', [visitID, patientID])
  .then(function (result){
    if(!result[0][0]){ return false }
    return db.query('UPDATE Visits SET visitStatus =? WHERE visitID =?;', [db.COMPLETED_VISIT, visitID]).then(function (result){
      return results[0][0].changedRows === 1
    })
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var deleteRejectedAppointment = function (visitID, patientID){
  return db.query('SELECT 1 FROM Visits WHERE Visits.visitID =? AND Visits.patientID =? AND Visits.visitStatus =? LIMIT 1;', [visitID, patientID, db.REJECTED_VISIT])
  .then(function (result){
    if(!result[0][0]){ return false }
    return db.query('DELETE FROM Visits WHERE visitID =?;', [visitID]).then(function (result){
      return results[0][0].affectedRows === 1
    })
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var editAppointmentDetails = function (visitID, diagnosis, symptoms, patientID){
  return db.query('SELECT 1 FROM Visits WHERE Visits.visitID =? AND Visits.patientID =? LIMIT 1;', [visitID, doctorID])
  .then(function (result){
    if(!result[0][0]){ return false }
    return db.query('UPDATE Visits SET diagnosis =?, symptoms =? WHERE visitID =?;', [diagnosis, symptoms, visitID]).then(function (result){
      return results[0][0].affectedRows === 1
    })
  }).catch(function (err){
    console.log(err)
    return false
  })
}

var hadVisitWithDoctor = function (doctorID, patientID, visitID){
  if(visitID === ''){ return true }
  return db.query('SELECT 1 FROM Visits WHERE doctorID =? AND patientID =? AND visitID =? LIMIT 1;', [doctorID, patientID, visitID]).then(function (result){
    return result[0][0] !== undefined
  })
}

var addVitals = function (vitals, patientID){
  //patients do not have to attach vitals to visit
  //but if there is a visit, make sure patient had visit with doctor
  if(!v.visitID){ v.visitID = '' }
  return hadVisitWithDoctor(v.doctorID, patientID, v.visitID).then(function (result){
    if(!result){ return false }
    return db.query('INSERT INTO Vitals (userID, visitID, vitalsDate, height, weight, BMI, temperature, pulse, respiratoryRate, bloodPressure, bloodOxygenSat) VALUES (?,?,?,?,?,?,?,?,?,?,?);', [v.patientID, v.visitID, v.vitalsDate, v.height, v.weight, v.BMI, v.temperature, v.pulse, v.respiratoryRate, v.bloodPressure, v.bloodOxygenSat])
    .then(function (result){
      return result[0].affectedRows === 1
    })
  })
}

var addNote = function (note, patientID){
  if(!vitals.visitID){ vitals.visitID = '' }
  return hadVisitWithPatient(v.doctorID, patientID, v.visitID).then(function (result){
    if(!result){ return false }
    return db.query('INSERT INTO Notes (userID, visitID, note) VALUES (?,?,?);', [patientID, n.visitID, n.note])
    .then(function (result){
      return result[0].affectedRows === 1
    })
  })
}

var addImage = function (image, patientID){
  if(!vitals.visitID){ vitals.visitID = '' }
  return hadVisitWithPatient(v.doctorID, patientID, v.visitID).then(function (result){
    if(!result){ return false }
    //save image here
    var filePath = ''
    return db.query('INSERT INTO ExternalData (userID, visitID, dataTypeID, filePath, dataName) VALUES (?,?,?,?,?);', [patientID, i.visitID, i.dataTypeID, filePath, i.dataName])
    .then(function (result){
      return result[0].affectedRows === 1
    })
  })
}

var addPrescription = function (prescription, patientID){
  if(!vitals.visitID){ vitals.visitID = '' }
  return hadVisitWithPatient(v.doctorID, patientID, v.visitID).then(function (result){
    if(!result){ return false }
    return db.query('INSERT INTO MedicationPatient (userID, visitID, dosage, startDate, stopDate, notes, doctorID, doctorName) VALUES (?,?,?,?,?,?,?,?);', [patientID, p.visitID, p.dosage, p.startDate, p.stopDate, p.notes, p.doctorID, p.doctorName])
    .then(function (result){
      return result[0].affectedRows === 1
    })
  })
}

module.exports = {
  register: register,
  edit: edit,
  deletePatient: deletePatient,
  info: info,
  getDoctors: getDoctors,
  getDoctor: getDoctor,
  getDoctorDetails: getDoctorDetails,
  getPatient: getPatient,
  requestAppointment: requestAppointment,
  getCurrentAppointments: getCurrentAppointments,
  getAppointmentDetail: getAppointmentDetail,
  getPastAppointments: getPastAppointments,
  completeAppointment: completeAppointment,
  deleteRejectedAppointment: deleteRejectedAppointment,
  editAppointmentDetails: editAppointmentDetails,
  addVitals: addVitals,
  addNote: addNote,
  addImage: addImage,
  addPrescription: addPrescription
}
