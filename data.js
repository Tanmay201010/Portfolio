// Student Management System - Data Store
// This file is read and written dynamically using the GitHub API.

window.TEACHER_PASSWORD_HASH = "cde383eee8ee7a4400adf7a15f716f179a2eb97646b37e089eb8d6d04e663416";

window.GITHUB_CONFIG = {
  "token_part1": "",
  "token_part2": "",
  "owner": "Tanmay201010",
  "repo": "Portfolio",
  "branch": "main",
  "path": "data.js"
};

window.sections = [];

window.students = [
  {
    "id": 1,
    "first_name": "Tanmay",
    "id_number_hash": "200b75b5d21fb01e0239c422481838daa0ec9b7259627c5ad69a98132ae6d803",
    "encrypted_id_number": "570a0838c8d0edf43c439d5f100701d9:a31f41e2ea1af8fd972412a8:a1b5e6b81860e3e6e49dfe31ceeefb6d3eb0d16d7c23b5ae",
    "encrypted_observations": "4cce303fea5703aa143387056d71ee19:f3af5586848c925272f35027:11b5ec65f50a6672fedb86f59efb7b34ab2466cc9234c956774c285a5b258a5cac6c5f3b309ca4f66ecf6d7377145e47e48ac48cf2f2c02c58f17b953f2363dff61318e869eb1555b85b3a0b45c9023b28b5748383c7d958ef195a2559875cc21ce231a220bfc7b14d56a31ffe3178742c0088aabc8423680219ebb87001c8dad6c61eb94d0c27bc"
  },
  {
    "id": 2,
    "first_name": "Saalim",
    "id_number_hash": "13c0f62212575ee4fc665be8b5d008bb39a6c6a57d4999a5eaa0aaba07ee3b84",
    "encrypted_id_number": "abfa6b8055aa85448bd715d35a11e2e4:740c54236254a57de0ab0142:602a53179b3119cfda3f0762f3ba98b248409da7d4600c38",
    "encrypted_observations": "7ae09a67fddd73b73753fa3e27374816:b388639c4a7d06cc103760e3:42bfefdfe97d35fbd869064de02e84f6ed8a8ef2f593e57bc6adfeb32f4bf6ec3f110c357021947db2fe7033fb3c14237c303afa1f120785dace409ec6ce1c21be9077ab7f0c7f3c2c42f601d79a630e0a8e2d4c9988529fb43ffb198d0950781e01e8ee27c125e625a9121c2174efa020fc283c5ff086131270dd3d07"
  },
  {
    "id": 3,
    "first_name": "Dhruv",
    "id_number_hash": "a96f27f6fc1073ebe45f1b7a6daa14af11053a2ae4ae664a31b00d5823573a4c",
    "encrypted_id_number": "a26538a0e327c6b1e20247b915b92679:4d34dd3842141ebe579e3a0b:4cbf369b61116c01f1839bfbc6887e831141f2eb3591426a",
    "encrypted_observations": "cb0615b69056ef004a21e53113e51061:bbb82a2fd561364710b7c9ba:3c0021f3b30ce6542fe2e8aeec31ee787147db66e1bbb0220f1ed6d51f579e2c3cc9cdea2a2758b13fc80ca8752f45a7bfa7b6caaf5d7740b8362bb18d82b2791aae1a13a3b8a396b3a0b713849bab994c0d4fdda916266dd1dfca425ef79a7d6f33bbff348cc9fff550908c2fc71564531881dd4f36f23f0c54e2b8b41ee698726a5deae5afb9b315ae8b1523f51b95690518da507d9dd8642e9dc2d802c375cf7220f982eea071491d568ebaa976c1e52e7d03c0c7789c58ebc047517a904e4137ac3975e6962e08c692c1f0b11daf46c0011ec68d6d2ebc1adc90063dedcd33957a4fd7ebcf846b29b40f4acc5578f798dc040a9ef01275d1bdc7437fd2febca66a39b8"
  },
  {
    "id": 4,
    "first_name": "xyz",
    "id_number_hash": "108f02fc913a0847fddd5cdb44681b3eec6b15b359f1cf7407639d708efb3a72",
    "encrypted_id_number": "92d10844862f49b93857390a0ed8e155:ecc4abdb073d72b981a76523:3724494e36bd1c5775b64cb7dccdaf43252b1662c1dae7",
    "encrypted_observations": "79b87b750b9e7ba45690a892d202f676:b504375e9bf90389dfc5f45e:39e68c566210ec7ddabecc4b350bedb077ca31007aa3bb1bb2fc954baba5eded414f657aeaee9112d352b1aa0033c24f8be660b752d080a1de42349af9560f49f842"
  },
  {
    "id": 5,
    "first_name": "Mehull",
    "id_number_hash": "2df9f32993401c7b07d34f3d4c22e129432a94e9db1ab35d75333bd6b1cd35a3",
    "encrypted_id_number": "889d6fcee2ec6c81d9ee4ab4e3e16471:4e9fe77c1abfc7897dc2515d:75f2725548eed1226a7b8daf6ee2e02f88bddbf07f1f58",
    "encrypted_observations": "eec29c0ca3c97db2148d3fd0e42201c6:8a823e7877bfe6172b7bfd99:b374b96b9aee6a15c1570c957655804fcda1fa1e8acdec2312dee833f7e6f155f2b8399af8f29fb3337eb083bb97d1e3b26ce80a3289b599d178b580303e6839"
  },
  {
    "id": 6,
    "first_name": "Tanmay",
    "section": "Section I",
    "id_number_hash": "7aee02d34dad4a5afe6a6adaca5a55a6854298769769a9b0916ea821a1da31e0",
    "encrypted_id_number": "633699c7986a9329d0667034d7fb610f:2edb50db63c973475292ce85:9e8102366723511a703577830d528508f67f9a19eb21bf",
    "encrypted_observations": "3d802e7f6881981dbf250eaa1edc8791:4294ff7702524676cf66330f:c04dc5b728c2c640121de3cf95fe76ed640d492d0cf7e6051a763effc12e1248108b0231b66e7c950e72da84ba93bc03192a73d3ec5a82d5ea82c0174660c19c40d83bc414a22be1c9efea74fc022aef9d679f2dd4e627c2d5a78c67a4157e75ca3b6ae13358b328a0892111fcf285"
  }
];
