document.querySelectorAll("pre code").forEach((e=>{const n=e.innerHTML.split("\n"),r=n.find((e=>""!==e.trim())),c=r?r.match(/^\s*/)[0]:"",i=n.map((e=>e.replace(new RegExp(`^${c}`),"")));e.innerHTML=i.join("\n")}));