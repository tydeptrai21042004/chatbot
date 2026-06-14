import{NextRequest,NextResponse}from"next/server";import{readIdentity}from"@/src/server/auth/auth";import{teacherRecords}from"@/src/server/data/store";
export async function GET(req:NextRequest){const id=readIdentity(req);if(!id||id.role!=="teacher")return NextResponse.json({ok:false,error:"Forbidden"},{status:403});return NextResponse.json({ok:true,records:teacherRecords(id.id)});}
