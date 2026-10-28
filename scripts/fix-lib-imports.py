import re,os,sys
root='src/lib'
def resolve(spec):
    base=os.path.join(root,spec)
    if re.search(r'\.(js|ts|svelte|json|css)$',spec): return spec
    for ext,out in (('.ts','.js'),('.svelte.ts','.svelte.js'),('.d.ts','.js')):
        if os.path.exists(base+ext): return spec+out
    if os.path.exists(os.path.join(base,'index.ts')): return spec+'/index.js'
    return spec
for dp,_,fs in os.walk('src'):
    for f in fs:
        if not f.endswith(('.ts','.svelte')): continue
        p=os.path.join(dp,f); s=open(p).read()
        n=re.sub(r"(['\"])#lib/([^'\"]+)\1",lambda m:m.group(1)+'#lib/'+resolve(m.group(2))+m.group(1),s)
        if n!=s: open(p,'w').write(n); print('fixed',p)
