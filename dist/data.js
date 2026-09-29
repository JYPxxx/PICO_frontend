export const agents = [
{id:1,name:'티켓온',initial:'온',color:'blue',intro:'간절한 마음을 알기에, 한 자리도 소중하게.',rating:4.9,reviews:128,trades:186,success:96,reply:8,fee:10000,career:'4년',sites:['NOL','YES24','멜론티켓'],category:'콘서트',verified:3,dates:[18,19,20,22,25],detail:'콘서트를 사랑하는 마음으로 4년째 함께하고 있어요.\n공연장별 좌석과 예매처의 특성을 꼼꼼하게 확인하고, 협의한 조건에 맞춰 정당한 방법으로 예매를 도와드립니다.\n\n예매 전 희망 구역과 성공 조건을 충분히 이야기해요. 예매가 끝나면 결과와 진행 내역을 빠르게 공유해 드릴게요.'},
{id:2,name:'좋은자리',initial:'자',color:'peach',intro:'뮤지컬의 감동이 더 가까워지는 자리, 함께 찾아요.',rating:4.9,reviews:86,trades:142,success:94,reply:12,fee:8000,career:'3년',sites:['NOL','YES24','티켓링크'],category:'뮤지컬',verified:3,dates:[18,20,23,26]},
{id:3,name:'포유티켓',initial:'유',color:'violet',intro:'처음 하는 티켓팅도 편안하게, 차근차근 안내해요.',rating:4.8,reviews:64,trades:98,success:92,reply:10,fee:10000,career:'2년',sites:['멜론티켓','NOL','티켓링크'],category:'콘서트',verified:2,dates:[19,20,21,24]},
{id:4,name:'한자리',initial:'한',color:'mint',intro:'좋아하는 아티스트를 만나는 순간까지 함께해요.',rating:4.9,reviews:52,trades:76,success:95,reply:15,fee:12000,career:'3년',sites:['YES24','멜론티켓','NOL'],category:'팬미팅',verified:3,dates:[18,21,22,25]},
{id:5,name:'커튼콜',initial:'콜',color:'pink',intro:'공연을 잘 아는 뮤지컬 애호가의 꼼꼼한 예매 도움.',rating:4.7,reviews:39,trades:63,success:89,reply:18,fee:7000,career:'2년',sites:['NOL','티켓링크'],category:'뮤지컬',verified:2,dates:[18,19,23,24]},
{id:6,name:'스탠바이',initial:'스',color:'sand',intro:'페스티벌부터 콘서트까지, 설레는 시작을 함께.',rating:4.8,reviews:45,trades:82,success:91,reply:9,fee:9000,career:'3년',sites:['YES24','멜론티켓'],category:'페스티벌',verified:3,dates:[20,22,25,26]}
];
export const initialRequests=[
{id:201,agentId:1,show:'태연 콘서트',date:'2026-09-19',site:'NOL',seat:'1층 1~12구역, 연석 2매',conditions:'시야 제한석 제외, 연석 2매 예매 시 성공',notes:'예매 전 문자로 연락 부탁드려요.',status:'pending',created:'2026.09.15 13:20',step:0,starting:10000,successFee:30000},
{id:202,agentId:2,show:'뮤지컬 프리미어',date:'2026-09-20',site:'YES24',seat:'VIP석 중앙 10열 이내 1매',conditions:'중앙 블록 VIP석 1매',notes:'통로석도 괜찮아요.',status:'accepted',created:'2026.09.14 18:42',step:2,starting:8000,successFee:20000},
{id:203,agentId:3,show:'데이식스 콘서트',date:'2026-09-12',site:'멜론티켓',seat:'지정석 2매',conditions:'지정석 연석 2매',notes:'',status:'completed',created:'2026.09.10 10:05',step:6,starting:10000,successFee:30000,result:'success'},
{id:204,agentId:4,show:'가을 팬미팅',date:'2026-09-11',site:'YES24',seat:'지정석 1매',conditions:'1층 지정석',notes:'',status:'cancelled',created:'2026.09.09 09:30',step:0,starting:12000,successFee:20000}
];

