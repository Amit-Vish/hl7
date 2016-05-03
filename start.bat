
for /d %%G in ("./*") do (
  cd ./%%G
  	Echo starting node in : %%G
    start cmd /C node .
 
  cd ../
)