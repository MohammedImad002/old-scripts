const fs = require("fs");
const path = require("path");

const INPUT_FILE = path.join(__dirname, "input-login.json");
const OUTPUT_FILE = path.join(__dirname, "output.json");

function updateUsersPreservingFullStructure() {
  const rawData = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));

  // Step 1: Extract only the `user` objects
  const allUsers = rawData.map(entry => entry.data.user);

  // Step 2: Find the reference "Class 11" student
  const class11Student = allUsers.find(
    user =>
      user.role === "student" &&
      user.batchName === "Class 11" &&
      Array.isArray(user.courses) &&
      user.courses.length > 0 &&
      Array.isArray(user.questionBankCourses) &&
      user.questionBankCourses.length > 0
  );

  if (!class11Student) {
    console.error("❌ Class 11 student with required data not found.");
    return;
  }

  const sourceCourse = class11Student.courses[0];
  const sourceQB = class11Student.questionBankCourses[0];

  // Step 3: Update rawData directly and preserve full structure
  const updatedRawData = rawData.map(entry => {
    const user = entry.data.user;

    if (user.role === "student" && user.batchName === "Class 12") {
      if (!user.courses) user.courses = [];
      if (!user.questionBankCourses) user.questionBankCourses = [];

      const hasCourse = user.courses.some(c => c._id === sourceCourse._id);
      const hasQB = user.questionBankCourses.some(qb => qb.courseId === sourceQB.courseId);

      if (!hasCourse) {
        user.courses.push(sourceCourse);
        console.log(`✅ Added course to ${user.username}`);
      }

      if (!hasQB) {
        user.questionBankCourses.push(sourceQB);
        console.log(`✅ Added QB course to ${user.username}`);
      }
    }

    return entry; // full object: { message, data: { token, user, ... } }
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(updatedRawData, null, 2));
  console.log(`✅ Output written to ${OUTPUT_FILE}`);
}

updateUsersPreservingFullStructure();
