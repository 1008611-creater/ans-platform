// @vitest-environment node
import { beforeEach,describe,expect,it,vi } from "vitest";
import type { DbTransaction } from "@/lib/db";
const m=vi.hoisted(()=>({clock:vi.fn()}));
vi.mock("@/lib/db",()=>({db:{}}));
vi.mock("@/server/competitions/agrihackathon/workspace",()=>({agriDatabaseClock:m.clock}));
import { rankPopularityResults, syncAgriPopularityStar, popularityView, type PopularityRoundRow } from "@/server/competitions/agrihackathon/popularity";
const round:PopularityRoundRow={id:'round',competitionId:'edition',revision:1,opensAt:new Date('2026-10-15T00:00:00Z'),closesAt:new Date('2026-10-15T01:00:00Z'),configuredById:'staff',frozenAt:null,results:null};
const now=new Date('2026-10-15T00:30:00Z');
function transaction(){const query=vi.fn(),execute=vi.fn().mockResolvedValue(1);return{tx:{$queryRaw:query,$executeRaw:execute} as unknown as DbTransaction,query,execute};}
beforeEach(()=>{vi.resetAllMocks();m.clock.mockResolvedValue(now);});
describe('agri popularity vote boundary',()=>{
 it('gives shared first place for an equal positive count and no award at zero',()=>{
  expect(rankPopularityResults([{entryId:'a',listingId:'a',title:'A',teamName:'A',votes:3},{entryId:'b',listingId:'b',title:'B',teamName:'B',votes:3},{entryId:'c',listingId:'c',title:'C',teamName:'C',votes:1}]).map(x=>[x.rank,x.winner])).toEqual([[1,true],[1,true],[3,false]]);
  expect(rankPopularityResults([{entryId:'a',listingId:'a',title:'A',teamName:'A',votes:0}])[0].winner).toBe(false);
 });
 it('only inserts an eligible confirmed Star within the voting window',async()=>{
  const {tx,query,execute}=transaction();query.mockResolvedValueOnce([{...round}]).mockResolvedValueOnce([{id:'wall',eligible:true}]);
  await syncAgriPopularityStar(tx,'listing','voter',true);expect(execute).toHaveBeenCalledOnce();
  expect(execute.mock.calls[0][0].join('')).toContain('ON CONFLICT');expect(execute.mock.calls[0]).toContain('voter');
 });
 it('does not insert a own-team or unavailable-account vote',async()=>{
  const {tx,query,execute}=transaction();query.mockResolvedValueOnce([{...round}]).mockResolvedValueOnce([{id:'wall',eligible:false}]);
  await syncAgriPopularityStar(tx,'listing','voter',true);expect(execute.mock.calls[0][0].join('')).toContain('DELETE FROM agri_popularity_votes');
 });
 it('supports cancelling a valid vote before the deadline',async()=>{
  const {tx,query,execute}=transaction();query.mockResolvedValueOnce([{...round}]).mockResolvedValueOnce([{id:'wall',eligible:true}]);
  await syncAgriPopularityStar(tx,'listing','voter',false);expect(execute.mock.calls[0][0].join('')).toContain('DELETE FROM agri_popularity_votes');
 });
 it('a pre-window Star cannot enter the competition automatically',async()=>{
  m.clock.mockResolvedValue(new Date('2026-10-14T23:59:59Z'));const {tx,query,execute}=transaction();query.mockResolvedValue([{...round}]);
  await syncAgriPopularityStar(tx,'listing','voter',true);expect(execute).not.toHaveBeenCalled();expect(query).toHaveBeenCalledOnce();
 });
 it('deadline freezes positive tied results and later unstar does not alter them',async()=>{
  m.clock.mockResolvedValue(round.closesAt);const {tx,query,execute}=transaction();
  query.mockResolvedValueOnce([{...round}]).mockResolvedValueOnce([{entryId:'wall',listingId:'listing',title:'Project',teamName:'Team',votes:1}]);
  await syncAgriPopularityStar(tx,'listing','voter',false);expect(execute).toHaveBeenCalledOnce();expect(execute.mock.calls[0][0].join('')).toContain('UPDATE agri_popularity_rounds');
 });
 it('closed view uses stored results rather than recounting changed stars or accounts',async()=>{
  const {tx,query}=transaction();const results=[{entryId:'wall',listingId:'listing',title:'Project',teamName:'Team',votes:2,rank:1,winner:true}];
  const view=await popularityView(tx,{...round,frozenAt:round.closesAt,results});expect(view?.results).toEqual(results);expect(view?.state).toBe('CLOSED');expect(query).not.toHaveBeenCalled();
 });
});
