from django.db.models import Q
from .models import Flight, Aircraft, Profile, Pilot


####
# Flight Scheduling Service
####


class FlightSchedulingService:

    @staticmethod
    def check_aircraft_availability(aircraft, departure_time, arrival_time, exclude_flight_id=None):
        """
        Check if an aircraft is available for the given time window.
        Looks for any existing flights that overlap with the requested time.
        Returns True if available, False if not.

        exclude_flight_id should be assigned if rescheduling or editing flight
        that is already on the schedule.
        """
        overlapping = Flight.objects.filter(
            aircraft=aircraft,
            departure_time__lt=arrival_time,
            arrival_time__gte=departure_time,
        )

        if exclude_flight_id:
            overlapping = overlapping.exclude(id=exclude_flight_id)

        return not overlapping.exists()


    @staticmethod
    def check_pilot_availability(pilot, departure_time, arrival_time, exclude_flight_id=None):
        """
        Check if a pilot is available for the given time window.
        Looks for any existing flights where the pilot is primary or secondary
        that overlap with the requested time.
        Returns True if available, False if not.
        """
        overlapping = Flight.objects.filter(
            departure_time__lt=arrival_time,
            arrival_time__gte=departure_time,
        ).filter(
            Q(primary_pilot=pilot) | Q(secondary_pilot=pilot)
        )

        if exclude_flight_id:
            overlapping = overlapping.exclude(id=exclude_flight_id)

        return not overlapping.exists()

    @staticmethod
    def check_pilot_medical_clearance(pilot, flight_date):
        """
        Check if a pilot is medically cleared to fly on the given date.
        Delegates to the Pilot model's is_cleared_to_fly() method.
        Returns True if cleared, False if not.
        """
        return pilot.pilot_info.is_cleared_to_fly(flight_date)

    @staticmethod
    def check_pilot_certification(pilot, required_certification):
        """
        Check if a pilot meets the required certification level for the flight.
        Delegates to the Pilot model's is_certified() method.
        Returns True if certified, False if not.
        """
        return pilot.pilot_info.is_certified(required_certification)

    @staticmethod
    def validate_flight_request(aircraft, primary_pilot, secondary_pilot, departure_time, arrival_time, pilot_requirement, exclude_flight_id=None):
        """
        Main validation method that runs all checks for a flight request.
        Calls the individual check methods above and collects any errors.
        Returns a dict of errors — empty dict means all checks passed.
        """
        errors = {}

        # Check aircraft availability
        if FlightSchedulingService.check_aircraft_availability(aircraft, departure_time, arrival_time, exclude_flight_id) is False:
            errors["aircraft"] = "Aircraft is not available for this time window."

        # Check primary pilot availability


        # Check secondary pilot availability (if provided)

        # Check primary pilot medical clearance

        # Check secondary pilot medical clearance (if provided)

        # Check primary pilot certification level

        # Check secondary pilot certification level (if provided)

        return errors

    @staticmethod
    def schedule_flight(flight_data):
        """
        Attempt to schedule a flight.
        Runs validate_flight_request() first — if errors exist, returns them
        without creating the flight. If all checks pass, creates and saves
        the Flight object.
        Returns a tuple of (flight_or_none, errors_dict).
        """
        pass
