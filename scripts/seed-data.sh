#!/bin/bash
# Seed script for all JogaFacil entities
# Usage: bash scripts/seed-data.sh
# Drops all data first, then seeds: academies, coaches, teams, students, places, schedule, payment types, payments

PROFILE="debitech"
REGION="us-west-1"
ACADEMIES_TABLE="jogafacil-academies-dev"
COACHES_TABLE="jogafacil-coaches-dev"
TEAMS_TABLE="jogafacil-teams-dev"
STUDENTS_TABLE="jogafacil-students-dev"
PLACES_TABLE="jogafacil-places-dev"
SCHEDULE_TABLE="jogafacil-schedule-dev"
PAYMENTS_TABLE="jogafacil-payments-dev"
PAYMENT_TYPES_TABLE="jogafacil-payment-type-templates-dev"
TS="2026-03-11T00:00:00"

# ============================================
# DROP ALL DATA
# ============================================
drop_table_data() {
  local TABLE_NAME=$1
  echo "Dropping all data from $TABLE_NAME..."
  local ITEMS
  ITEMS=$(aws dynamodb scan --table-name "$TABLE_NAME" --profile "$PROFILE" --region "$REGION" --projection-expression "id" --output json 2>/dev/null)
  if [ $? -ne 0 ]; then
    echo "  Warning: Could not scan $TABLE_NAME (table may not exist yet)"
    return
  fi
  local IDS
  IDS=$(echo "$ITEMS" | python3 -c "import sys,json; data=json.load(sys.stdin); [print(item['id']['S']) for item in data.get('Items',[])]" 2>/dev/null)
  local COUNT=0
  for ID in $IDS; do
    aws dynamodb delete-item --table-name "$TABLE_NAME" --profile "$PROFILE" --region "$REGION" --key "{\"id\":{\"S\":\"$ID\"}}" 2>/dev/null
    COUNT=$((COUNT + 1))
  done
  echo "  Deleted $COUNT items from $TABLE_NAME"
}

echo "=========================================="
echo "  DROPPING ALL EXISTING DATA"
echo "=========================================="
drop_table_data "$PAYMENTS_TABLE"
drop_table_data "$PAYMENT_TYPES_TABLE"
drop_table_data "$SCHEDULE_TABLE"
drop_table_data "$PLACES_TABLE"
drop_table_data "$STUDENTS_TABLE"
drop_table_data "$TEAMS_TABLE"
drop_table_data "$COACHES_TABLE"
drop_table_data "$ACADEMIES_TABLE"
echo ""

# ============================================
# HELPER FUNCTIONS
# ============================================
put_academy() {
  aws dynamodb put-item --table-name $ACADEMIES_TABLE --profile $PROFILE --region $REGION --item "$1"
}
put_coach() {
  aws dynamodb put-item --table-name $COACHES_TABLE --profile $PROFILE --region $REGION --item "$1"
}
put_team() {
  aws dynamodb put-item --table-name $TEAMS_TABLE --profile $PROFILE --region $REGION --item "$1"
}
put_student() {
  aws dynamodb put-item --table-name $STUDENTS_TABLE --profile $PROFILE --region $REGION --item "$1"
}
put_place() {
  aws dynamodb put-item --table-name $PLACES_TABLE --profile $PROFILE --region $REGION --item "$1"
}
put_schedule() {
  aws dynamodb put-item --table-name $SCHEDULE_TABLE --profile $PROFILE --region $REGION --item "$1"
}
put_payment_type() {
  aws dynamodb put-item --table-name $PAYMENT_TYPES_TABLE --profile $PROFILE --region $REGION --item "$1"
}
put_payment() {
  aws dynamodb put-item --table-name $PAYMENTS_TABLE --profile $PROFILE --region $REGION --item "$1"
}

# ============================================
# ACADEMIES
# ============================================
echo "=== Creating Academies ==="

put_academy '{"id":{"S":"Progreso"},"name":{"S":"Academia Progreso"},"address":{"S":"Av. Progreso 1234, Guadalajara"},"phone":{"S":"+52 33 1234-5678"},"email":{"S":"info@progreso.com"},"status":{"S":"active"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_academy '{"id":{"S":"Gasperich"},"name":{"S":"Academia Gasperich"},"address":{"S":"Rue de Gasperich 56, Luxembourg"},"phone":{"S":"+352 26 48 00"},"email":{"S":"info@gasperich.lu"},"status":{"S":"active"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

echo "Academies created."

# ============================================
# COACHES
# ============================================
echo "=== Creating Progreso Coaches ==="

put_coach '{"id":{"S":"prog-c1"},"name":{"S":"Roberto Silva"},"email":{"S":"roberto.silva@email.com"},"phone":{"S":"+52 33 2001-0001"},"specialty":{"S":"Formación infantil"},"experience":{"S":"8 años"},"status":{"S":"active"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_coach '{"id":{"S":"prog-c2"},"name":{"S":"Antonio Perez"},"email":{"S":"antonio.perez@email.com"},"phone":{"S":"+52 33 2001-0002"},"specialty":{"S":"Preparación física"},"experience":{"S":"5 años"},"status":{"S":"active"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_coach '{"id":{"S":"prog-c3"},"name":{"S":"Juan Carlos Vega"},"email":{"S":"juancarlos.vega@email.com"},"phone":{"S":"+52 33 2001-0003"},"specialty":{"S":"Porteros"},"experience":{"S":"10 años"},"status":{"S":"active"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

echo "=== Creating Gasperich Coaches ==="

put_coach '{"id":{"S":"gasp-c1"},"name":{"S":"Hans Mueller"},"email":{"S":"hans.mueller@email.com"},"phone":{"S":"+352 630-0001"},"specialty":{"S":"Jugendtraining"},"experience":{"S":"12 años"},"status":{"S":"active"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_coach '{"id":{"S":"gasp-c2"},"name":{"S":"Peter Schneider"},"email":{"S":"peter.schneider@email.com"},"phone":{"S":"+352 630-0002"},"specialty":{"S":"Taktik"},"experience":{"S":"7 años"},"status":{"S":"active"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_coach '{"id":{"S":"gasp-c3"},"name":{"S":"Klaus Weber"},"email":{"S":"klaus.weber@email.com"},"phone":{"S":"+352 630-0003"},"specialty":{"S":"Torwarttraining"},"experience":{"S":"6 años"},"status":{"S":"active"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

echo "Coaches created."

# ============================================
# TEAMS - Progreso
# ============================================
echo "=== Creating Progreso Teams ==="

put_team '{"id":{"S":"prog-t1"},"name":{"S":"Sub-8 Progreso"},"category":{"S":"Infantil"},"ageGroup":{"S":"6-8 años"},"coachIds":{"L":[{"S":"prog-c1"}]},"maxCapacity":{"N":"20"},"currentSize":{"N":"11"},"status":{"S":"active"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_team '{"id":{"S":"prog-t2"},"name":{"S":"Sub-10 Progreso"},"category":{"S":"Infantil"},"ageGroup":{"S":"8-10 años"},"coachIds":{"L":[{"S":"prog-c1"}]},"maxCapacity":{"N":"20"},"currentSize":{"N":"11"},"status":{"S":"active"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_team '{"id":{"S":"prog-t3"},"name":{"S":"Sub-12 Progreso"},"category":{"S":"Infantil"},"ageGroup":{"S":"10-12 años"},"coachIds":{"L":[{"S":"prog-c2"}]},"maxCapacity":{"N":"20"},"currentSize":{"N":"11"},"status":{"S":"active"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_team '{"id":{"S":"prog-t4"},"name":{"S":"Sub-14 Progreso"},"category":{"S":"Juvenil"},"ageGroup":{"S":"12-14 años"},"coachIds":{"L":[{"S":"prog-c2"}]},"maxCapacity":{"N":"20"},"currentSize":{"N":"11"},"status":{"S":"active"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_team '{"id":{"S":"prog-t5"},"name":{"S":"Sub-16 Progreso"},"category":{"S":"Juvenil"},"ageGroup":{"S":"14-16 años"},"coachIds":{"L":[{"S":"prog-c3"}]},"maxCapacity":{"N":"20"},"currentSize":{"N":"11"},"status":{"S":"active"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

# ============================================
# TEAMS - Gasperich
# ============================================
echo "=== Creating Gasperich Teams ==="

put_team '{"id":{"S":"gasp-t1"},"name":{"S":"Sub-8 Gasperich"},"category":{"S":"Infantil"},"ageGroup":{"S":"6-8 años"},"coachIds":{"L":[{"S":"gasp-c1"}]},"maxCapacity":{"N":"20"},"currentSize":{"N":"11"},"status":{"S":"active"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_team '{"id":{"S":"gasp-t2"},"name":{"S":"Sub-10 Gasperich"},"category":{"S":"Infantil"},"ageGroup":{"S":"8-10 años"},"coachIds":{"L":[{"S":"gasp-c1"}]},"maxCapacity":{"N":"20"},"currentSize":{"N":"11"},"status":{"S":"active"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_team '{"id":{"S":"gasp-t3"},"name":{"S":"Sub-12 Gasperich"},"category":{"S":"Infantil"},"ageGroup":{"S":"10-12 años"},"coachIds":{"L":[{"S":"gasp-c2"}]},"maxCapacity":{"N":"20"},"currentSize":{"N":"11"},"status":{"S":"active"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_team '{"id":{"S":"gasp-t4"},"name":{"S":"Sub-14 Gasperich"},"category":{"S":"Juvenil"},"ageGroup":{"S":"12-14 años"},"coachIds":{"L":[{"S":"gasp-c2"}]},"maxCapacity":{"N":"20"},"currentSize":{"N":"11"},"status":{"S":"active"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_team '{"id":{"S":"gasp-t5"},"name":{"S":"Sub-16 Gasperich"},"category":{"S":"Juvenil"},"ageGroup":{"S":"14-16 años"},"coachIds":{"L":[{"S":"gasp-c3"}]},"maxCapacity":{"N":"20"},"currentSize":{"N":"11"},"status":{"S":"active"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

echo "Teams created."

# ============================================
# STUDENTS - Progreso (11 per team, spread across 5 teams)
# ============================================
echo "=== Creating Progreso Students ==="

# Sub-8 Progreso students
put_student '{"id":{"S":"prog-s01"},"name":{"S":"Carlos Mendoza"},"email":{"S":"carlos.mendoza@email.com"},"phone":{"S":"+52 33 3001-0001"},"teamIds":{"L":[{"S":"prog-t1"}]},"position":{"S":"Delantero"},"dateOfBirth":{"S":"2018-03-15"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"prog-s02"},"name":{"S":"Diego Ramirez"},"email":{"S":"diego.ramirez@email.com"},"phone":{"S":"+52 33 3001-0002"},"teamIds":{"L":[{"S":"prog-t1"}]},"position":{"S":"Mediocampista"},"dateOfBirth":{"S":"2018-07-22"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"prog-s03"},"name":{"S":"Luis Torres"},"email":{"S":"luis.torres@email.com"},"phone":{"S":"+52 33 3001-0003"},"teamIds":{"L":[{"S":"prog-t1"}]},"position":{"S":"Defensa"},"dateOfBirth":{"S":"2019-01-10"},"status":{"S":"active"},"paymentWindow":{"N":"2"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

# Sub-10 Progreso students
put_student '{"id":{"S":"prog-s04"},"name":{"S":"Miguel Flores"},"email":{"S":"miguel.flores@email.com"},"phone":{"S":"+52 33 3001-0004"},"teamIds":{"L":[{"S":"prog-t2"}]},"position":{"S":"Portero"},"dateOfBirth":{"S":"2016-05-20"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"prog-s05"},"name":{"S":"Andres Garcia"},"email":{"S":"andres.garcia@email.com"},"phone":{"S":"+52 33 3001-0005"},"teamIds":{"L":[{"S":"prog-t2"}]},"position":{"S":"Delantero"},"dateOfBirth":{"S":"2016-11-03"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"prog-s06"},"name":{"S":"Fernando Lopez"},"email":{"S":"fernando.lopez@email.com"},"phone":{"S":"+52 33 3001-0006"},"teamIds":{"L":[{"S":"prog-t2"}]},"position":{"S":"Mediocampista"},"dateOfBirth":{"S":"2017-02-14"},"status":{"S":"active"},"paymentWindow":{"N":"2"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

# Sub-12 Progreso students
put_student '{"id":{"S":"prog-s07"},"name":{"S":"Ricardo Hernandez"},"email":{"S":"ricardo.hernandez@email.com"},"phone":{"S":"+52 33 3001-0007"},"teamIds":{"L":[{"S":"prog-t3"}]},"position":{"S":"Defensa"},"dateOfBirth":{"S":"2014-08-30"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"prog-s08"},"name":{"S":"Javier Martinez"},"email":{"S":"javier.martinez@email.com"},"phone":{"S":"+52 33 3001-0008"},"teamIds":{"L":[{"S":"prog-t3"}]},"position":{"S":"Delantero"},"dateOfBirth":{"S":"2014-12-05"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

# Sub-14 Progreso students
put_student '{"id":{"S":"prog-s09"},"name":{"S":"Pablo Sanchez"},"email":{"S":"pablo.sanchez@email.com"},"phone":{"S":"+52 33 3001-0009"},"teamIds":{"L":[{"S":"prog-t4"}]},"position":{"S":"Mediocampista"},"dateOfBirth":{"S":"2012-04-18"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"prog-s10"},"name":{"S":"Eduardo Diaz"},"email":{"S":"eduardo.diaz@email.com"},"phone":{"S":"+52 33 3001-0010"},"teamIds":{"L":[{"S":"prog-t4"}]},"position":{"S":"Portero"},"dateOfBirth":{"S":"2012-09-25"},"status":{"S":"active"},"paymentWindow":{"N":"2"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

# Sub-16 Progreso students
put_student '{"id":{"S":"prog-s11"},"name":{"S":"Alejandro Ruiz"},"email":{"S":"alejandro.ruiz@email.com"},"phone":{"S":"+52 33 3001-0011"},"teamIds":{"L":[{"S":"prog-t5"}]},"position":{"S":"Defensa"},"dateOfBirth":{"S":"2010-06-12"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"prog-s12"},"name":{"S":"Gabriel Moreno"},"email":{"S":"gabriel.moreno@email.com"},"phone":{"S":"+52 33 3001-0012"},"teamIds":{"L":[{"S":"prog-t5"}]},"position":{"S":"Delantero"},"dateOfBirth":{"S":"2010-10-08"},"status":{"S":"inactive"},"paymentWindow":{"N":"1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

echo "Progreso students created."

# ============================================
# STUDENTS - Gasperich
# ============================================
echo "=== Creating Gasperich Students ==="

# Sub-8 Gasperich students
put_student '{"id":{"S":"gasp-s01"},"name":{"S":"Luca Hoffmann"},"email":{"S":"luca.hoffmann@email.com"},"phone":{"S":"+352 631-0001"},"teamIds":{"L":[{"S":"gasp-t1"}]},"position":{"S":"Delantero"},"dateOfBirth":{"S":"2018-04-10"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"gasp-s02"},"name":{"S":"Noah Fischer"},"email":{"S":"noah.fischer@email.com"},"phone":{"S":"+352 631-0002"},"teamIds":{"L":[{"S":"gasp-t1"}]},"position":{"S":"Mediocampista"},"dateOfBirth":{"S":"2018-08-19"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"gasp-s03"},"name":{"S":"Felix Wagner"},"email":{"S":"felix.wagner@email.com"},"phone":{"S":"+352 631-0003"},"teamIds":{"L":[{"S":"gasp-t1"}]},"position":{"S":"Defensa"},"dateOfBirth":{"S":"2019-02-28"},"status":{"S":"active"},"paymentWindow":{"N":"2"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

# Sub-10 Gasperich students
put_student '{"id":{"S":"gasp-s04"},"name":{"S":"Max Becker"},"email":{"S":"max.becker@email.com"},"phone":{"S":"+352 631-0004"},"teamIds":{"L":[{"S":"gasp-t2"}]},"position":{"S":"Portero"},"dateOfBirth":{"S":"2016-06-15"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"gasp-s05"},"name":{"S":"Leon Braun"},"email":{"S":"leon.braun@email.com"},"phone":{"S":"+352 631-0005"},"teamIds":{"L":[{"S":"gasp-t2"}]},"position":{"S":"Delantero"},"dateOfBirth":{"S":"2016-12-01"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"gasp-s06"},"name":{"S":"Tim Richter"},"email":{"S":"tim.richter@email.com"},"phone":{"S":"+352 631-0006"},"teamIds":{"L":[{"S":"gasp-t2"}]},"position":{"S":"Mediocampista"},"dateOfBirth":{"S":"2017-03-20"},"status":{"S":"active"},"paymentWindow":{"N":"2"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

# Sub-12 Gasperich students
put_student '{"id":{"S":"gasp-s07"},"name":{"S":"Paul Klein"},"email":{"S":"paul.klein@email.com"},"phone":{"S":"+352 631-0007"},"teamIds":{"L":[{"S":"gasp-t3"}]},"position":{"S":"Defensa"},"dateOfBirth":{"S":"2014-09-14"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"gasp-s08"},"name":{"S":"Jan Wolf"},"email":{"S":"jan.wolf@email.com"},"phone":{"S":"+352 631-0008"},"teamIds":{"L":[{"S":"gasp-t3"}]},"position":{"S":"Delantero"},"dateOfBirth":{"S":"2015-01-07"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

# Sub-14 Gasperich students
put_student '{"id":{"S":"gasp-s09"},"name":{"S":"David Schaefer"},"email":{"S":"david.schaefer@email.com"},"phone":{"S":"+352 631-0009"},"teamIds":{"L":[{"S":"gasp-t4"}]},"position":{"S":"Mediocampista"},"dateOfBirth":{"S":"2012-05-22"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"gasp-s10"},"name":{"S":"Lukas Neumann"},"email":{"S":"lukas.neumann@email.com"},"phone":{"S":"+352 631-0010"},"teamIds":{"L":[{"S":"gasp-t4"}]},"position":{"S":"Portero"},"dateOfBirth":{"S":"2012-10-30"},"status":{"S":"active"},"paymentWindow":{"N":"2"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

# Sub-16 Gasperich students
put_student '{"id":{"S":"gasp-s11"},"name":{"S":"Moritz Schwarz"},"email":{"S":"moritz.schwarz@email.com"},"phone":{"S":"+352 631-0011"},"teamIds":{"L":[{"S":"gasp-t5"}]},"position":{"S":"Defensa"},"dateOfBirth":{"S":"2010-07-18"},"status":{"S":"active"},"paymentWindow":{"N":"1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_student '{"id":{"S":"gasp-s12"},"name":{"S":"Finn Zimmermann"},"email":{"S":"finn.zimmermann@email.com"},"phone":{"S":"+352 631-0012"},"teamIds":{"L":[{"S":"gasp-t5"}]},"position":{"S":"Delantero"},"dateOfBirth":{"S":"2010-11-25"},"status":{"S":"inactive"},"paymentWindow":{"N":"1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

echo "Gasperich students created."

# ============================================
# PLACES - Progreso
# ============================================
echo "=== Creating Progreso Places ==="

put_place '{"id":{"S":"prog-p1"},"name":{"S":"Campo Principal Progreso"},"address":{"S":"Av. Progreso 1234, Guadalajara"},"capacity":{"N":"200"},"facilities":{"L":[{"S":"cancha_futbol"},{"S":"vestidores"},{"S":"estacionamiento"}]},"hourlyRate":{"N":"150"},"status":{"S":"active"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_place '{"id":{"S":"prog-p2"},"name":{"S":"Cancha Auxiliar Progreso"},"address":{"S":"Calle Reforma 567, Guadalajara"},"capacity":{"N":"100"},"facilities":{"L":[{"S":"cancha_futbol"},{"S":"iluminacion"}]},"hourlyRate":{"N":"80"},"status":{"S":"active"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

echo "=== Creating Gasperich Places ==="

put_place '{"id":{"S":"gasp-p1"},"name":{"S":"Terrain Principal Gasperich"},"address":{"S":"Rue de Gasperich 56, Luxembourg"},"capacity":{"N":"300"},"facilities":{"L":[{"S":"cancha_futbol"},{"S":"vestidores"},{"S":"cafeteria"},{"S":"estacionamiento"}]},"hourlyRate":{"N":"200"},"status":{"S":"active"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_place '{"id":{"S":"gasp-p2"},"name":{"S":"Terrain Secondaire Gasperich"},"address":{"S":"Rue du Stade 12, Luxembourg"},"capacity":{"N":"150"},"facilities":{"L":[{"S":"cancha_futbol"},{"S":"iluminacion"}]},"hourlyRate":{"N":"120"},"status":{"S":"active"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

echo "Places created."

# ============================================
# SCHEDULE - Progreso (upcoming week)
# ============================================
echo "=== Creating Progreso Schedule ==="

put_schedule '{"id":{"S":"prog-sch01"},"date":{"S":"2026-03-16"},"teamId":{"S":"prog-t1"},"placeId":{"S":"prog-p1"},"startTime":{"S":"09:00"},"endTime":{"S":"10:30"},"type":{"S":"training"},"status":{"S":"scheduled"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_schedule '{"id":{"S":"prog-sch02"},"date":{"S":"2026-03-16"},"teamId":{"S":"prog-t2"},"placeId":{"S":"prog-p1"},"startTime":{"S":"11:00"},"endTime":{"S":"12:30"},"type":{"S":"training"},"status":{"S":"scheduled"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_schedule '{"id":{"S":"prog-sch03"},"date":{"S":"2026-03-17"},"teamId":{"S":"prog-t3"},"placeId":{"S":"prog-p2"},"startTime":{"S":"16:00"},"endTime":{"S":"17:30"},"type":{"S":"training"},"status":{"S":"scheduled"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_schedule '{"id":{"S":"prog-sch04"},"date":{"S":"2026-03-18"},"teamId":{"S":"prog-t4"},"placeId":{"S":"prog-p1"},"startTime":{"S":"17:00"},"endTime":{"S":"18:30"},"type":{"S":"training"},"status":{"S":"scheduled"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_schedule '{"id":{"S":"prog-sch05"},"date":{"S":"2026-03-19"},"teamId":{"S":"prog-t5"},"placeId":{"S":"prog-p1"},"startTime":{"S":"17:00"},"endTime":{"S":"19:00"},"type":{"S":"training"},"status":{"S":"scheduled"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_schedule '{"id":{"S":"prog-sch06"},"date":{"S":"2026-03-21"},"teamId":{"S":"prog-t3"},"placeId":{"S":"prog-p1"},"startTime":{"S":"10:00"},"endTime":{"S":"12:00"},"type":{"S":"match"},"opponent":{"S":"Club Deportivo Atlas"},"status":{"S":"scheduled"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

echo "=== Creating Gasperich Schedule ==="

put_schedule '{"id":{"S":"gasp-sch01"},"date":{"S":"2026-03-16"},"teamId":{"S":"gasp-t1"},"placeId":{"S":"gasp-p1"},"startTime":{"S":"09:00"},"endTime":{"S":"10:30"},"type":{"S":"training"},"status":{"S":"scheduled"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_schedule '{"id":{"S":"gasp-sch02"},"date":{"S":"2026-03-16"},"teamId":{"S":"gasp-t2"},"placeId":{"S":"gasp-p1"},"startTime":{"S":"11:00"},"endTime":{"S":"12:30"},"type":{"S":"training"},"status":{"S":"scheduled"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_schedule '{"id":{"S":"gasp-sch03"},"date":{"S":"2026-03-17"},"teamId":{"S":"gasp-t3"},"placeId":{"S":"gasp-p2"},"startTime":{"S":"16:00"},"endTime":{"S":"17:30"},"type":{"S":"training"},"status":{"S":"scheduled"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_schedule '{"id":{"S":"gasp-sch04"},"date":{"S":"2026-03-18"},"teamId":{"S":"gasp-t4"},"placeId":{"S":"gasp-p1"},"startTime":{"S":"17:00"},"endTime":{"S":"18:30"},"type":{"S":"training"},"status":{"S":"scheduled"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_schedule '{"id":{"S":"gasp-sch05"},"date":{"S":"2026-03-19"},"teamId":{"S":"gasp-t5"},"placeId":{"S":"gasp-p1"},"startTime":{"S":"17:00"},"endTime":{"S":"19:00"},"type":{"S":"training"},"status":{"S":"scheduled"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_schedule '{"id":{"S":"gasp-sch06"},"date":{"S":"2026-03-22"},"teamId":{"S":"gasp-t4"},"placeId":{"S":"gasp-p1"},"startTime":{"S":"10:00"},"endTime":{"S":"12:00"},"type":{"S":"friendly"},"opponent":{"S":"FC Bonnevoie"},"status":{"S":"scheduled"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

echo "Schedule created."

# ============================================
# PAYMENT TYPE TEMPLATES
# ============================================
echo "=== Creating Payment Type Templates ==="

# Progreso templates
put_payment_type '{"id":{"S":"prog-pt1"},"name":{"S":"Mensualidad"},"defaultAmount":{"N":"100"},"academy":{"S":"Progreso"},"description":{"S":"Cuota mensual de entrenamiento"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment_type '{"id":{"S":"prog-pt2"},"name":{"S":"Inscripción"},"defaultAmount":{"N":"50"},"academy":{"S":"Progreso"},"description":{"S":"Cuota de inscripción inicial"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment_type '{"id":{"S":"prog-pt3"},"name":{"S":"Uniforme"},"defaultAmount":{"N":"75"},"academy":{"S":"Progreso"},"description":{"S":"Kit de uniforme completo"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

# Gasperich templates
put_payment_type '{"id":{"S":"gasp-pt1"},"name":{"S":"Mensualidad"},"defaultAmount":{"N":"150"},"academy":{"S":"Gasperich"},"description":{"S":"Cuota mensual de entrenamiento"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment_type '{"id":{"S":"gasp-pt2"},"name":{"S":"Inscripción"},"defaultAmount":{"N":"80"},"academy":{"S":"Gasperich"},"description":{"S":"Cuota de inscripción inicial"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment_type '{"id":{"S":"gasp-pt3"},"name":{"S":"Uniforme"},"defaultAmount":{"N":"90"},"academy":{"S":"Gasperich"},"description":{"S":"Kit de uniforme completo"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

echo "Payment type templates created."

# ============================================
# PAYMENTS - Progreso (March 2026 mensualidades)
# ============================================
echo "=== Creating Progreso Payments ==="

put_payment '{"id":{"S":"prog-pay01"},"studentId":{"S":"prog-s01"},"studentName":{"S":"Carlos Mendoza"},"amount":{"N":"100"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"paid"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"prog-pt1"},"paidDate":{"S":"2026-03-03"},"method":{"S":"transfer"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"prog-pay02"},"studentId":{"S":"prog-s02"},"studentName":{"S":"Diego Ramirez"},"amount":{"N":"100"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"paid"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"prog-pt1"},"paidDate":{"S":"2026-03-04"},"method":{"S":"cash"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"prog-pay03"},"studentId":{"S":"prog-s03"},"studentName":{"S":"Luis Torres"},"amount":{"N":"100"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-15"},"status":{"S":"pending"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"prog-pt1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"prog-pay04"},"studentId":{"S":"prog-s04"},"studentName":{"S":"Miguel Flores"},"amount":{"N":"100"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"paid"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"prog-pt1"},"paidDate":{"S":"2026-03-01"},"method":{"S":"card"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"prog-pay05"},"studentId":{"S":"prog-s05"},"studentName":{"S":"Andres Garcia"},"amount":{"N":"100"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"overdue"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"prog-pt1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"prog-pay06"},"studentId":{"S":"prog-s06"},"studentName":{"S":"Fernando Lopez"},"amount":{"N":"100"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-15"},"status":{"S":"pending"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"prog-pt1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"prog-pay07"},"studentId":{"S":"prog-s07"},"studentName":{"S":"Ricardo Hernandez"},"amount":{"N":"100"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"paid"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"prog-pt1"},"paidDate":{"S":"2026-03-05"},"method":{"S":"transfer"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"prog-pay08"},"studentId":{"S":"prog-s08"},"studentName":{"S":"Javier Martinez"},"amount":{"N":"100"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"overdue"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"prog-pt1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"prog-pay09"},"studentId":{"S":"prog-s09"},"studentName":{"S":"Pablo Sanchez"},"amount":{"N":"100"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"paid"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"prog-pt1"},"paidDate":{"S":"2026-03-02"},"method":{"S":"cash"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"prog-pay10"},"studentId":{"S":"prog-s10"},"studentName":{"S":"Eduardo Diaz"},"amount":{"N":"100"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-15"},"status":{"S":"pending"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"prog-pt1"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"prog-pay11"},"studentId":{"S":"prog-s11"},"studentName":{"S":"Alejandro Ruiz"},"amount":{"N":"100"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"paid"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"prog-pt1"},"paidDate":{"S":"2026-03-04"},"method":{"S":"transfer"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

# One inscription payment example
put_payment '{"id":{"S":"prog-pay12"},"studentId":{"S":"prog-s01"},"studentName":{"S":"Carlos Mendoza"},"amount":{"N":"50"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-01"},"status":{"S":"paid"},"paymentType":{"S":"inscripcion"},"paymentTypeTemplateId":{"S":"prog-pt2"},"paidDate":{"S":"2026-03-01"},"method":{"S":"cash"},"academy":{"S":"Progreso"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

echo "Progreso payments created."

# ============================================
# PAYMENTS - Gasperich (March 2026 mensualidades)
# ============================================
echo "=== Creating Gasperich Payments ==="

put_payment '{"id":{"S":"gasp-pay01"},"studentId":{"S":"gasp-s01"},"studentName":{"S":"Luca Hoffmann"},"amount":{"N":"150"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"paid"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"gasp-pt1"},"paidDate":{"S":"2026-03-02"},"method":{"S":"transfer"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"gasp-pay02"},"studentId":{"S":"gasp-s02"},"studentName":{"S":"Noah Fischer"},"amount":{"N":"150"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"paid"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"gasp-pt1"},"paidDate":{"S":"2026-03-03"},"method":{"S":"card"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"gasp-pay03"},"studentId":{"S":"gasp-s03"},"studentName":{"S":"Felix Wagner"},"amount":{"N":"150"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-15"},"status":{"S":"pending"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"gasp-pt1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"gasp-pay04"},"studentId":{"S":"gasp-s04"},"studentName":{"S":"Max Becker"},"amount":{"N":"150"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"paid"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"gasp-pt1"},"paidDate":{"S":"2026-03-01"},"method":{"S":"transfer"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"gasp-pay05"},"studentId":{"S":"gasp-s05"},"studentName":{"S":"Leon Braun"},"amount":{"N":"150"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"overdue"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"gasp-pt1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"gasp-pay06"},"studentId":{"S":"gasp-s06"},"studentName":{"S":"Tim Richter"},"amount":{"N":"150"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-15"},"status":{"S":"pending"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"gasp-pt1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"gasp-pay07"},"studentId":{"S":"gasp-s07"},"studentName":{"S":"Paul Klein"},"amount":{"N":"150"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"paid"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"gasp-pt1"},"paidDate":{"S":"2026-03-04"},"method":{"S":"cash"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"gasp-pay08"},"studentId":{"S":"gasp-s08"},"studentName":{"S":"Jan Wolf"},"amount":{"N":"150"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"overdue"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"gasp-pt1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"gasp-pay09"},"studentId":{"S":"gasp-s09"},"studentName":{"S":"David Schaefer"},"amount":{"N":"150"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"paid"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"gasp-pt1"},"paidDate":{"S":"2026-03-05"},"method":{"S":"transfer"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"gasp-pay10"},"studentId":{"S":"gasp-s10"},"studentName":{"S":"Lukas Neumann"},"amount":{"N":"150"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-15"},"status":{"S":"pending"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"gasp-pt1"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'
put_payment '{"id":{"S":"gasp-pay11"},"studentId":{"S":"gasp-s11"},"studentName":{"S":"Moritz Schwarz"},"amount":{"N":"150"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-05"},"status":{"S":"paid"},"paymentType":{"S":"mensualidad"},"paymentTypeTemplateId":{"S":"gasp-pt1"},"paidDate":{"S":"2026-03-03"},"method":{"S":"card"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

# One inscription payment example
put_payment '{"id":{"S":"gasp-pay12"},"studentId":{"S":"gasp-s01"},"studentName":{"S":"Luca Hoffmann"},"amount":{"N":"80"},"month":{"S":"2026-03"},"dueDate":{"S":"2026-03-01"},"status":{"S":"paid"},"paymentType":{"S":"inscripcion"},"paymentTypeTemplateId":{"S":"gasp-pt2"},"paidDate":{"S":"2026-03-01"},"method":{"S":"card"},"academy":{"S":"Gasperich"},"createdAt":{"S":"'$TS'"},"updatedAt":{"S":"'$TS'"}}'

echo "Gasperich payments created."

echo ""
echo "=========================================="
echo "  SEED COMPLETE"
echo "=========================================="
echo "  Academies:      2 (Progreso, Gasperich)"
echo "  Coaches:         6 (3 per academy)"
echo "  Teams:          10 (5 per academy)"
echo "  Students:       24 (12 per academy)"
echo "  Places:          4 (2 per academy)"
echo "  Schedule:       12 (6 per academy)"
echo "  Payment Types:   6 (3 per academy)"
echo "  Payments:       24 (12 per academy)"
echo "=========================================="
