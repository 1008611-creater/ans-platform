// @vitest-environment node
import { beforeEach,describe,expect,it,vi } from "vitest";
vi.mock("@/lib/auth",()=>({auth:vi.fn()}));
vi.mock("@/server/competitions/agrihackathon/wall",()=>({readAgriWall:vi.fn(),readAgriWallMine:vi.fn(),executeAgriWallCommand:vi.fn()}));
import { auth } from "@/lib/auth";
import { readAgriWall,readAgriWallMine,executeAgriWallCommand } from "@/server/competitions/agrihackathon/wall";
import { AgriWorkspaceError } from "@/contracts/agri-workspace";
import { GET,POST } from "@/app/api/competitions/agrihackathon/wall/route";
import { GET as mine } from "@/app/api/competitions/agrihackathon/wall/mine/route";
const origin='https://ans.example';let serial=0;let actor='';
const bind={action:'bind',teamCompetitionId:'entry',listingId:'listing',expectedVersion:1};
function request(body?:unknown,identity=actor,from=origin){return new Request(origin+'/api/competitions/agrihackathon/wall',{headers:{'x-ans-actor':identity,...(body?{origin:from,'content-type':'application/json'}:{})},...(body?{method:'POST',body:JSON.stringify(body)}:{})});}
beforeEach(()=>{vi.resetAllMocks();actor='wall-user-'+serial++;vi.mocked(auth).mockResolvedValue({user:{id:actor}} as never);for(const key of ['AUTH_URL','NEXTAUTH_URL','NEXT_PUBLIC_APP_URL'])vi.stubEnv(key,'');});
describe('agri wall HTTP authority',()=>{
 it('exposes public wall without login or private team lookup',async()=>{vi.mocked(auth).mockResolvedValue(null as never);vi.mocked(readAgriWall).mockResolvedValue({configured:false,competitionId:null,round:null,entries:[]});expect((await GET(new Request(origin+"/api/competitions/agrihackathon/wall"))).status).toBe(200);expect(readAgriWall).toHaveBeenCalledWith(undefined);expect(readAgriWallMine).not.toHaveBeenCalled();});
 it('private team reads and mutations require login and current actor',async()=>{vi.mocked(auth).mockResolvedValue(null as never);expect((await mine(request())).status).toBe(401);expect((await POST(request(bind))).status).toBe(401);vi.mocked(auth).mockResolvedValue({user:{id:actor}} as never);expect((await mine(request(undefined,'old'))).status).toBe(409);expect((await GET(request(undefined,'old'))).status).toBe(409);expect((await POST(request(bind,'old'))).status).toBe(409);expect(executeAgriWallCommand).not.toHaveBeenCalled();});
 it('rejects cross-origin mutation and forwards only session actor',async()=>{expect((await POST(request(bind,actor,'https://other.invalid'))).status).toBe(403);expect((await POST(request(bind))).status).toBe(200);expect(executeAgriWallCommand).toHaveBeenCalledWith(actor,bind);});
 it('preserves scope failures and hides private server diagnostics',async()=>{vi.mocked(executeAgriWallCommand).mockRejectedValueOnce(new AgriWorkspaceError('AGRI_SCOPE_REQUIRED',403));expect((await POST(request(bind))).status).toBe(403);vi.mocked(executeAgriWallCommand).mockRejectedValueOnce(new Error('PRIVATE_CREDENTIALS'));const response=await POST(request(bind));expect(response.status).toBe(500);expect(JSON.stringify(await response.json())).not.toContain('PRIVATE_CREDENTIALS');expect(response.headers.get('cache-control')).toBe('no-store');});
 it('rejects extra public query parameters before service access',async()=>{expect((await GET(new Request(origin+'/api/competitions/agrihackathon/wall?userId=forged'))).status).toBe(400);expect(readAgriWall).not.toHaveBeenCalled();});
});
