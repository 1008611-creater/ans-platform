(function(root,factory){'use strict';if(typeof module==='object'&&module.exports)module.exports=factory();else root.ExamAnalysisView=factory();}(typeof window!=='undefined'?window:this,function(){
 'use strict';
 var pages={materials:{title:'材料工作台',description:'把练习留在这里，让每次分析都有据可循。'},report:{title:'学习报告',description:'看清这次练习，再决定下一步。'},knowledge:{title:'知识地图',description:'每一份作答证据，都是理解自己的一个坐标。'},history:{title:'分析记录',description:'保留每次分析的范围、结果与材料版本。'}};
 function pageMeta(key){return pages[key]||pages.materials;}
 function filterMaterials(materials,options){options=options||{};var query=String(options.query||'').trim().toLocaleLowerCase(),subject=options.subject||'all';return materials.filter(function(m){return (subject==='all'||m.subject===subject)&&(!query||m.name.toLocaleLowerCase().indexOf(query)>=0);});}
 return {pageMeta:pageMeta,filterMaterials:filterMaterials};
}));
